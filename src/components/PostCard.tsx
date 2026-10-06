import React, { useState } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Eye, 
  Flag, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Award, 
  Pin,
  Sparkles,
  ExternalLink,
  Lock,
  Globe,
  AlertTriangle
} from 'lucide-react';
import { Post, User } from '../types';
import { checkIsPostOwner } from '../utils/auth';

interface PostCardProps {
  post: Post;
  currentUser?: User | null;
  isOwner?: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onEditPost?: (post: Post) => void;
  onDeletePost?: (postId: string) => void;
  onApprovePost?: (postId: string) => void;
  onRejectPost?: (postId: string) => void;
  onPinPost?: (postId: string) => void;
  onViewDetails?: (postId: string) => void;
  isDemo?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  isOwner,
  onLike,
  onComment,
  onShare,
  onEditPost,
  onDeletePost,
  onApprovePost,
  onRejectPost,
  onPinPost,
  onViewDetails,
  isDemo = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 1. Post Owner Verification
  const ownerCheck = isOwner ?? checkIsPostOwner(currentUser, post);

  // 2. Comprehensive Admin Verification
  // පරිශීලක ප්‍රකාරයේ (User view/Switch view) සිටියද Admin Privileges පවතිනවාදැයි පරීක්ෂා කිරීම
  const isAdmin = !isDemo && (
    currentUser?.role === 'admin' || 
    currentUser?.isAdmin === true || 
    currentUser?.originalRole === 'admin'
  );

  // 3. Edit / Delete Permissions Check
  const canModify = ownerCheck || isAdmin;

  const isLiked = currentUser ? post.likes?.includes(currentUser.id) : false;

  const getStatusBadge = () => {
    switch (post.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" /> Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md ${post.isPinned ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''}`}>
      
      {/* Pinned Post Notification */}
      {post.isPinned && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-1.5 border-b border-indigo-100 dark:border-indigo-800/30 flex items-center justify-between text-xs font-medium text-indigo-700 dark:text-indigo-300">
          <span className="flex items-center">
            <Pin className="w-3.5 h-3.5 mr-1.5 fill-current" /> Pinned Post
          </span>
          {isAdmin && onPinPost && (
            <button 
              onClick={() => onPinPost(post.id)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs"
            >
              Unpin
            </button>
          )}
        </div>
      )}

      {/* Header Section */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <img 
              src={post.author?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces'} 
              alt={post.author?.name || 'Author'} 
              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
            />
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base leading-snug">
                  {post.author?.name || 'Anonymous User'}
                </h3>
                {post.author?.role === 'admin' && (
                  <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    ADMIN
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recently'}</span>
                <span>•</span>
                {getStatusBadge()}
              </div>
            </div>
          </div>

          {/* Quick Actions & Menu */}
          <div className="flex items-center space-x-1 relative">
            
            {/* Quick Edit/Delete Buttons (Directly Accessible via canModify) */}
            {canModify && (
              <div className="hidden sm:flex items-center space-x-1 mr-1">
                {onEditPost && (
                  <button
                    onClick={() => onEditPost(post)}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit Post"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                {onDeletePost && (
                  <button
                    onClick={() => onDeletePost(post.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Delete Post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* More Options Dropdown */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu Items */}
            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-20 text-sm">
                
                {onViewDetails && (
                  <button
                    onClick={() => { setShowMenu(false); onViewDetails(post.id); }}
                    className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                )}

                {canModify && onEditPost && (
                  <button
                    onClick={() => { setShowMenu(false); onEditPost(post); }}
                    className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center space-x-2 sm:hidden"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Post</span>
                  </button>
                )}

                {canModify && onDeletePost && (
                  <button
                    onClick={() => { setShowMenu(false); onDeletePost(post.id); }}
                    className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 sm:hidden"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Post</span>
                  </button>
                )}

                {/* Admin Specific Actions inside menu */}
                {isAdmin && (
                  <>
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                    
                    {onPinPost && (
                      <button
                        onClick={() => { setShowMenu(false); onPinPost(post.id); }}
                        className="w-full text-left px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center space-x-2"
                      >
                        <Pin className="w-4 h-4" />
                        <span>{post.isPinned ? 'Unpin Post' : 'Pin to Top'}</span>
                      </button>
                    )}

                    {post.status === 'pending' && onApprovePost && (
                      <button
                        onClick={() => { setShowMenu(false); onApprovePost(post.id); }}
                        className="w-full text-left px-4 py-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve Post</span>
                      </button>
                    )}

                    {post.status === 'pending' && onRejectPost && (
                      <button
                        onClick={() => { setShowMenu(false); onRejectPost(post.id); }}
                        className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Post</span>
                      </button>
                    )}
                  </>
                )}

              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-3">
          {post.title && (
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
              {post.title}
            </h2>
          )}
          
          <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base whitespace-pre-line leading-relaxed">
            {post.content}
          </p>

          {/* Media Attachments */}
          {post.image && !imageError && (
            <div className="mt-3 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 max-h-96">
              <img 
                src={post.image} 
                alt="Post attachment" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
              />
            </div>
          )}
        </div>

        {/* Action Bar (Likes, Comments, Shares) */}
        <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-gray-500 dark:text-gray-400 text-sm">
          <button
            onClick={() => onLike && onLike(post.id)}
            className={`flex items-center space-x-1.5 transition-colors ${
              isLiked 
                ? 'text-red-500 font-semibold' 
                : 'hover:text-red-500'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{post.likes?.length || 0}</span>
          </button>

          <button
            onClick={() => onComment && onComment(post.id)}
            className="flex items-center space-x-1.5 hover:text-indigo-600 transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            <span>{post.commentsCount || post.comments?.length || 0}</span>
          </button>

          <button
            onClick={() => onShare && onShare(post.id)}
            className="flex items-center space-x-1.5 hover:text-green-600 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>

      </div>
    </div>
  );
};
