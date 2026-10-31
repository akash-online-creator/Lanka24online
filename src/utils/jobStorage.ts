import { JobListing, JobFilters, ProximityFilterType, JobComment } from '../types/job';
export type { JobComment };
import { calculateDistanceKm } from './geoUtils';
import {
  subscribeToJobsFromFirestore,
  saveJobToFirestore,
  deleteJobFromFirestore,
  subscribeToJobCommentsFromFirestore,
  saveJobCommentToFirestore,
} from '../lib/firebase';

const LOCAL_STORAGE_KEY = 'sahaya_jobs_v1';
const COMMENTS_STORAGE_KEY = 'sahaya_job_comments_v1';

// Real-time Firestore listener so jobs published by any user appear for everyone
if (typeof window !== 'undefined') {
  try {
    subscribeToJobsFromFirestore((remoteJobs) => {
      if (!Array.isArray(remoteJobs)) return;
      const localJobs = getStoredJobs();
      const map = new Map<string, JobListing>();
      localJobs.forEach((j) => {
        if (j && j.id) map.set(j.id, j);
      });
      remoteJobs.forEach((j: any) => {
        if (j && j.id) map.set(j.id, j as JobListing);
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      );
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('sahaya_jobs_updated', { detail: { count: merged.length } }));
      } catch {}
    });
  } catch {}
}

const activeJobCommentListeners = new Set<string>();

export { calculateDistanceKm };

/**
 * Formats distance into localized display strings and travel time estimations
 */
export function formatProximityDisplay(distanceKm: number): {
  distanceStr: string;
  walkMinutes: number;
  tuktukMinutes: number;
  isWalkable: boolean;
  isTuktukClose: boolean;
} {
  const distanceStr = distanceKm < 1 
    ? `මීටර් ${Math.round(distanceKm * 1000)}` 
    : `කි.මී. ${distanceKm.toFixed(1)}`;
  
  const walkMinutes = Math.max(1, Math.round(distanceKm * 12.5));
  const tuktukMinutes = Math.max(1, Math.round(distanceKm * 2.5));

  return {
    distanceStr,
    walkMinutes,
    tuktukMinutes,
    isWalkable: distanceKm <= 2.5,
    isTuktukClose: distanceKm <= 12.0
  };
}

/**
 * Retrieves all stored jobs from LocalStorage. Starts completely clean without mock data.
 */
export function getStoredJobs(): JobListing[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading jobs from localStorage:', e);
  }
  return [];
}

/**
 * Saves jobs array to LocalStorage
 */
export function saveJobsToStorage(jobs: JobListing[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(jobs));
    window.dispatchEvent(new CustomEvent('sahaya_jobs_updated', { detail: { count: jobs.length } }));
  } catch (e) {
    console.error('Error saving jobs to localStorage:', e);
  }
}

/**
 * Adds a new job listing to storage
 */
export function addJobListing(newJob: Omit<JobListing, 'id' | 'createdAtMs'>): JobListing {
  const existing = getStoredJobs();
  const created: JobListing = {
    ...newJob,
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAtMs: Date.now(),
    viewsCount: 1,
    commentsCount: 0,
  };
  const updated = [created, ...existing];
  saveJobsToStorage(updated);
  saveJobToFirestore(created).catch((err) => {
    console.warn('Firestore saveJobToFirestore notice:', err);
  });
  return created;
}

/**
 * Deletes a job listing by ID
 */
export function deleteJobListing(jobId: string): void {
  const existing = getStoredJobs();
  const filtered = existing.filter((j) => j.id !== jobId);
  saveJobsToStorage(filtered);
  deleteJobFromFirestore(jobId).catch((err) => {
    console.warn('Firestore deleteJobFromFirestore notice:', err);
  });
}

/**
 * Retrieves all public comments for a specific job (and subscribes to cloud updates)
 */
export function getJobComments(jobId: string): JobComment[] {
  if (typeof window !== 'undefined' && jobId && !activeJobCommentListeners.has(jobId)) {
    activeJobCommentListeners.add(jobId);
    try {
      subscribeToJobCommentsFromFirestore(jobId, (remoteComments) => {
        if (!Array.isArray(remoteComments)) return;
        const map = new Map<string, JobComment>();
        try {
          const raw = localStorage.getItem(`${COMMENTS_STORAGE_KEY}_${jobId}`);
          const local: JobComment[] = raw ? JSON.parse(raw) : [];
          local.forEach((c) => {
            if (c && c.id) map.set(c.id, c);
          });
        } catch {}
        remoteComments.forEach((c: any) => {
          if (c && c.id) map.set(c.id, c as JobComment);
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
        );
        try {
          localStorage.setItem(`${COMMENTS_STORAGE_KEY}_${jobId}`, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent('sahaya_job_comments_updated', { detail: { jobId, count: merged.length } }));
        } catch {}
      });
    } catch {}
  }

  try {
    const raw = localStorage.getItem(`${COMMENTS_STORAGE_KEY}_${jobId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading job comments:', e);
  }
  return [];
}

/**
 * Adds a new public comment to a job listing
 */
export function addJobComment(jobId: string, authorName: string, text: string, userId?: string): JobComment {
  const comments = getJobComments(jobId);
  const newComment: JobComment = {
    id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    jobId,
    userId: userId || 'guest_user',
    userName: authorName.trim() || 'පරිශීලක',
    text: text.trim(),
    createdAtMs: Date.now(),
    createdAtStr: 'දැන් සුළු මොහොතකට පෙර',
  };
  const updated = [newComment, ...comments];
  try {
    localStorage.setItem(`${COMMENTS_STORAGE_KEY}_${jobId}`, JSON.stringify(updated));
    saveJobCommentToFirestore(jobId, newComment).catch(() => {});
    const jobs = getStoredJobs();
    const jIdx = jobs.findIndex(j => j.id === jobId);
    if (jIdx !== -1) {
      jobs[jIdx].commentsCount = updated.length;
      saveJobsToStorage(jobs);
      saveJobToFirestore(jobs[jIdx]).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('sahaya_job_comments_updated', { detail: { jobId, count: updated.length } }));
  } catch (e) {
    console.error('Error saving comment:', e);
  }
  return newComment;
}

/**
 * Filters and sorts job listings based on active filter criteria
 */
export function filterJobListings(
  jobs: JobListing[],
  filters: JobFilters,
  userLat?: number,
  userLng?: number
): JobListing[] {
  return jobs.filter((job) => {
    // 1. Scope filter (All, Local, Overseas)
    if (filters.scope !== 'all' && job.scope !== filters.scope) {
      return false;
    }

    // 2. Category filter
    if (filters.category !== 'all' && job.category !== filters.category) {
      return false;
    }

    // 3. Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const searchable = [
        job.title,
        job.companyName,
        job.description,
        job.city || '',
        job.district || '',
        job.country || '',
        job.agencyName || '',
        job.qualifications || '',
        job.contactPerson || '',
      ].join(' ').toLowerCase();

      if (!searchable.includes(q)) {
        return false;
      }
    }

    // 4. Job Type filter
    if (filters.jobType && filters.jobType !== 'all') {
      if (job.jobType !== filters.jobType) return false;
    }

    // 5. Country filter
    if (filters.country && filters.country !== 'all') {
      if (job.country && !job.country.toLowerCase().includes(filters.country.toLowerCase())) {
        return false;
      }
    }

    // 6. Minimum Salary filter
    if (filters.minSalary && filters.minSalary > 0) {
      const salary = job.scope === 'local' 
        ? (job.salaryMax || job.salaryMin || 0)
        : (job.salaryLkrApprox || 0);
      if (salary < filters.minSalary) return false;
    }

    // 7. Maximum Salary filter
    if (filters.maxSalary && filters.maxSalary > 0) {
      const salary = job.scope === 'local'
        ? (job.salaryMin || 0)
        : (job.salaryLkrApprox || 0);
      if (salary > filters.maxSalary) return false;
    }

    // 8. Benefits filter
    if (filters.benefits && filters.benefits.length > 0) {
      const hasAll = filters.benefits.every((b) => job.benefits.includes(b));
      if (!hasAll) return false;
    }

    // 9. Micro-distance filter
    if (filters.proximity !== 'all' && userLat && userLng) {
      if (job.scope === 'overseas') return false;

      const distKm = calculateDistanceKm(userLat, userLng, job.lat, job.lng);
      switch (filters.proximity) {
        case 'walk_15':
          if (distKm > 1.2) return false;
          break;
        case 'walk_30':
          if (distKm > 2.5) return false;
          break;
        case 'tuktuk_15':
          if (distKm > 6.0) return false;
          break;
        case 'tuktuk_30':
          if (distKm > 12.0) return false;
          break;
        case 'km_5':
          if (distKm > 5.0) return false;
          break;
        case 'km_15':
          if (distKm > 15.0) return false;
          break;
        case 'km_30':
          if (distKm > 30.0) return false;
          break;
        default:
          break;
      }
    }

    return true;
  });
}