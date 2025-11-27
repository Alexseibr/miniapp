import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { neonTheme, getNeonColor, getGlowStyle, type NeonColor } from './neonTheme';
import { NeonCard } from './NeonCard';
import { NeonBadge } from './NeonBadge';
import { Star, MessageCircle, AlertTriangle, Check, Loader2 } from 'lucide-react';

interface RatingReason {
  code: string;
  label: string;
  icon: ReactNode;
}

const RATING_REASONS: RatingReason[] = [
  { code: 'no_response', label: 'No Response', icon: <MessageCircle size={16} /> },
  { code: 'wrong_price', label: 'Wrong Price', icon: <AlertTriangle size={16} /> },
  { code: 'wrong_description', label: 'Wrong Description', icon: <AlertTriangle size={16} /> },
  { code: 'fake', label: 'Fake Ad', icon: <AlertTriangle size={16} /> },
  { code: 'rude', label: 'Rude Seller', icon: <MessageCircle size={16} /> },
  { code: 'other', label: 'Other', icon: <MessageCircle size={16} /> },
];

interface NeonRatingFormProps {
  adId: string;
  adTitle?: string;
  adImage?: string;
  contactId: string;
  onSubmit: (data: {
    score: number;
    reasonCode: string | null;
    comment: string | null;
  }) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export function NeonRatingForm({
  adId,
  adTitle,
  adImage,
  contactId,
  onSubmit,
  onCancel,
  className = '',
}: NeonRatingFormProps) {
  const [score, setScore] = useState<number>(0);
  const [hoveredScore, setHoveredScore] = useState<number>(0);
  const [reasonCode, setReasonCode] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const showReasons = score > 0 && score <= 3;
  const requiresReason = showReasons;

  const getScoreColor = (s: number): NeonColor => {
    if (s <= 2) return 'fuchsia';
    if (s === 3) return 'orange';
    return 'lime';
  };

  const getScoreLabel = (s: number): string => {
    switch (s) {
      case 1: return 'Very Bad';
      case 2: return 'Bad';
      case 3: return 'Average';
      case 4: return 'Good';
      case 5: return 'Excellent';
      default: return 'Rate this ad';
    }
  };

  const handleSubmit = async () => {
    if (score === 0) {
      setError('Please select a rating');
      return;
    }
    if (requiresReason && !reasonCode) {
      setError('Please select a reason');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        score,
        reasonCode: requiresReason ? reasonCode : null,
        comment: comment.trim() || null,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <NeonCard className={className} glowColor="lime" animated>
        <motion.div
          className="flex flex-col items-center justify-center py-8 gap-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <motion.div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: `${neonTheme.colors.success}20`,
              boxShadow: getGlowStyle('lime', 'normal'),
            }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <Check size={32} style={{ color: neonTheme.colors.success }} />
          </motion.div>
          <span
            className="text-lg font-semibold"
            style={{ color: neonTheme.colors.success }}
          >
            Thank you for your feedback!
          </span>
        </motion.div>
      </NeonCard>
    );
  }

  return (
    <NeonCard className={className} glowColor="cyan" animated>
      {adImage && (
        <div 
          className="w-full h-24 rounded-lg mb-4 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${adImage})`,
            border: `1px solid ${neonTheme.colors.border}`,
          }}
          data-testid="rating-ad-image"
        />
      )}
      
      {adTitle && (
        <h3
          className="text-sm font-medium mb-4 line-clamp-2"
          style={{ color: neonTheme.colors.textPrimary }}
          data-testid="rating-ad-title"
        >
          {adTitle}
        </h3>
      )}

      <div className="flex flex-col items-center gap-4">
        <span
          className="text-sm uppercase tracking-wider"
          style={{ color: neonTheme.colors.textMuted }}
        >
          Rate Your Experience
        </span>

        <div className="flex gap-2" data-testid="rating-stars">
          {[1, 2, 3, 4, 5].map((s) => {
            const isActive = s <= (hoveredScore || score);
            const color = getScoreColor(hoveredScore || score || s);
            
            return (
              <motion.button
                key={s}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: isActive ? `${getNeonColor(color)}20` : 'transparent',
                  boxShadow: isActive ? getGlowStyle(color, 'subtle') : 'none',
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setHoveredScore(s)}
                onMouseLeave={() => setHoveredScore(0)}
                onClick={() => {
                  setScore(s);
                  setReasonCode(null);
                  setError(null);
                }}
                data-testid={`rating-star-${s}`}
              >
                <Star
                  size={28}
                  fill={isActive ? getNeonColor(color) : 'transparent'}
                  stroke={isActive ? getNeonColor(color) : neonTheme.colors.textMuted}
                  style={{
                    filter: isActive ? `drop-shadow(${getGlowStyle(color, 'subtle')})` : 'none',
                  }}
                />
              </motion.button>
            );
          })}
        </div>

        <motion.span
          key={hoveredScore || score}
          className="text-base font-medium"
          style={{ 
            color: score > 0 ? getNeonColor(getScoreColor(hoveredScore || score)) : neonTheme.colors.textSecondary,
            fontFamily: neonTheme.fonts.digital,
          }}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="rating-score-label"
        >
          {getScoreLabel(hoveredScore || score)}
        </motion.span>
      </div>

      <AnimatePresence mode="wait">
        {showReasons && (
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span
              className="text-xs uppercase tracking-wider block mb-3"
              style={{ color: neonTheme.colors.textMuted }}
            >
              What went wrong?
            </span>
            
            <div className="flex flex-wrap gap-2">
              {RATING_REASONS.map((reason) => (
                <NeonBadge
                  key={reason.code}
                  variant={reasonCode === reason.code ? 'filled' : 'outlined'}
                  color={reasonCode === reason.code ? 'fuchsia' : 'cyan'}
                  onClick={() => {
                    setReasonCode(reason.code);
                    setError(null);
                  }}
                  data-testid={`rating-reason-${reason.code}`}
                >
                  {reason.icon}
                  <span className="ml-1">{reason.label}</span>
                </NeonBadge>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <span
          className="text-xs uppercase tracking-wider block mb-2"
          style={{ color: neonTheme.colors.textMuted }}
        >
          Additional Comments (optional)
        </span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          rows={3}
          className="w-full px-4 py-3 rounded-lg resize-none text-sm"
          style={{
            background: neonTheme.colors.backgroundSecondary,
            border: `1px solid ${neonTheme.colors.border}`,
            color: neonTheme.colors.textPrimary,
            outline: 'none',
          }}
          data-testid="rating-comment-input"
        />
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-4 px-4 py-2 rounded-lg flex items-center gap-2"
            style={{
              background: `${neonTheme.colors.error}20`,
              border: `1px solid ${neonTheme.colors.error}40`,
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            data-testid="rating-error"
          >
            <AlertTriangle size={16} style={{ color: neonTheme.colors.error }} />
            <span className="text-sm" style={{ color: neonTheme.colors.error }}>
              {error}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 mt-6">
        {onCancel && (
          <motion.button
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium"
            style={{
              background: 'transparent',
              border: `1px solid ${neonTheme.colors.border}`,
              color: neonTheme.colors.textSecondary,
            }}
            whileHover={{ 
              borderColor: neonTheme.colors.textSecondary,
              scale: 1.02,
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="rating-cancel-button"
          >
            Cancel
          </motion.button>
        )}
        
        <motion.button
          className="flex-1 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          style={{
            background: score > 0 
              ? `linear-gradient(135deg, ${getNeonColor(getScoreColor(score))}, ${getNeonColor(getScoreColor(score))}80)`
              : neonTheme.colors.backgroundSecondary,
            border: 'none',
            color: score > 0 ? neonTheme.colors.background : neonTheme.colors.textMuted,
            boxShadow: score > 0 ? getGlowStyle(getScoreColor(score), 'subtle') : 'none',
            cursor: score > 0 ? 'pointer' : 'not-allowed',
          }}
          whileHover={score > 0 ? { 
            scale: 1.02,
            boxShadow: getGlowStyle(getScoreColor(score), 'normal'),
          } : {}}
          whileTap={score > 0 ? { scale: 0.98 } : {}}
          onClick={handleSubmit}
          disabled={isSubmitting || score === 0}
          data-testid="rating-submit-button"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Rating'
          )}
        </motion.button>
      </div>
    </NeonCard>
  );
}

interface NeonRatingDisplayProps {
  avgScore: number;
  totalVotes: number;
  showVotes?: boolean;
  size?: 'sm' | 'md' | 'lg';
  glowColor?: NeonColor;
  className?: string;
}

export function NeonRatingDisplay({
  avgScore,
  totalVotes,
  showVotes = true,
  size = 'md',
  glowColor,
  className = '',
}: NeonRatingDisplayProps) {
  const getScoreColor = (): NeonColor => {
    if (!glowColor) {
      if (avgScore < 2.5) return 'fuchsia';
      if (avgScore < 3.5) return 'orange';
      return 'lime';
    }
    return glowColor;
  };

  const color = getScoreColor();
  const neonColor = getNeonColor(color);

  const sizeStyles = {
    sm: { star: 14, text: 'text-xs', gap: 'gap-0.5' },
    md: { star: 18, text: 'text-sm', gap: 'gap-1' },
    lg: { star: 24, text: 'text-base', gap: 'gap-1.5' },
  };

  const s = sizeStyles[size];

  return (
    <div className={`flex items-center ${s.gap} ${className}`} data-testid="rating-display">
      <div className="flex" data-testid="rating-display-stars">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= Math.round(avgScore);
          return (
            <Star
              key={star}
              size={s.star}
              fill={isActive ? neonColor : 'transparent'}
              stroke={isActive ? neonColor : neonTheme.colors.textMuted}
              style={{
                filter: isActive ? `drop-shadow(${getGlowStyle(color, 'subtle')})` : 'none',
              }}
            />
          );
        })}
      </div>
      
      <span
        className={`${s.text} font-medium`}
        style={{ 
          color: neonColor,
          fontFamily: neonTheme.fonts.digital,
        }}
        data-testid="rating-display-score"
      >
        {avgScore.toFixed(1)}
      </span>
      
      {showVotes && totalVotes > 0 && (
        <span
          className={s.text}
          style={{ color: neonTheme.colors.textMuted }}
          data-testid="rating-display-votes"
        >
          ({totalVotes})
        </span>
      )}
    </div>
  );
}

export default NeonRatingForm;
