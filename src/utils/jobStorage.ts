import { JobListing, JobFilters, ProximityFilterType } from '../types/job';
import { calculateDistanceKm } from './geoUtils';

const LOCAL_STORAGE_KEY = 'sahaya_jobs_v1';

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
  };
  const updated = [created, ...existing];
  saveJobsToStorage(updated);
  return created;
}

/**
 * Deletes a job listing by ID
 */
export function deleteJobListing(jobId: string): void {
  const existing = getStoredJobs();
  const filtered = existing.filter((j) => j.id !== jobId);
  saveJobsToStorage(filtered);
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
