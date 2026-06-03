'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ReviewCard, type Review } from '@/components/ReviewCard';
import { StarRating } from '@/components/StarRating';
import { createClient } from '@/lib/supabase/client';

type ListingReviewsSectionProps = {
  listingId: string;
  harbourId: string;
};

export default function ListingReviewsSection({ listingId, harbourId }: ListingReviewsSectionProps) {
  const supabase = useMemo(() => createClient(), []);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const fetchReviews = useCallback(async () => {
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('harbour_id', harbourId)
      .order('created_at', { ascending: false });

    if (reviewsData && reviewsData.length > 0) {
      const reviewerIds = reviewsData.map((r) => r.reviewer_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', reviewerIds);

      const reviewsWithNames: Review[] = reviewsData.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        host_response: review.host_response,
        created_at: review.created_at,
        reviewer_name: profilesData?.find((p) => p.id === review.reviewer_id)?.full_name || 'Anonym',
      }));

      setReviews(reviewsWithNames);

      const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
      setAverageRating(Math.round(avg * 10) / 10);
    } else {
      setReviews([]);
      setAverageRating(0);
    }
  }, [harbourId, supabase]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const submitReview = async () => {
    if (newReview.rating === 0) {
      setReviewError('Välj ett betyg');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setReviewError('Du måste vara inloggad för att lämna ett omdöme');
      setSubmittingReview(false);
      return;
    }

    const { data: bookingData } = await supabase
      .from('bookings')
      .select('id, listings!inner(harbour_id)')
      .eq('listing_id', listingId)
      .eq('renter_id', user.id)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (!bookingData) {
      setReviewError('Du kan bara lämna omdöme för hamnar du har bokat');
      setSubmittingReview(false);
      return;
    }

    const listingRelation = Array.isArray(bookingData.listings)
      ? bookingData.listings[0]
      : bookingData.listings;
    const bookingHarbourId = (listingRelation as { harbour_id?: string | number } | null | undefined)?.harbour_id;

    if (!bookingHarbourId || String(bookingHarbourId) !== String(harbourId)) {
      setReviewError('Kunde inte koppla bokningen till denna hamn');
      setSubmittingReview(false);
      return;
    }

    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingData.id)
      .maybeSingle();

    if (existingReview) {
      setReviewError('Du har redan lämnat ett omdöme för denna bokning');
      setSubmittingReview(false);
      return;
    }

    const { error } = await supabase.from('reviews').insert({
      harbour_id: harbourId,
      booking_id: bookingData.id,
      reviewer_id: user.id,
      rating: newReview.rating,
      comment: newReview.comment || null,
    });

    if (error) {
      setReviewError('Något gick fel. Försök igen.');
    } else {
      setReviewSuccess(true);
      setShowReviewForm(false);
      setNewReview({ rating: 0, comment: '' });
      window.location.reload();
    }

    setSubmittingReview(false);
  };

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="mb-6 text-xl font-extrabold text-[#0f1f3d]">Omdömen</h2>

      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="text-2xl font-bold text-gray-900">
            {averageRating > 0 ? averageRating.toFixed(1) : '–'}
          </span>
        </div>
        <span className="text-gray-600">
          {reviews.length > 0
            ? `${reviews.length} omdöme${reviews.length !== 1 ? 'n' : ''}`
            : 'Inga omdömen ännu'}
        </span>
      </div>

      {reviewSuccess ? (
        <p className="mb-4 text-sm font-medium text-[#0d9488]">Tack! Ditt omdöme har sparats.</p>
      ) : null}

      {reviews.length > 0 ? (
        <div className="space-y-0 mb-8">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 mb-8">Var den första att lämna ett omdöme för denna hamn!</p>
      )}

      {!showReviewForm ? (
        <button
          type="button"
          onClick={() => setShowReviewForm(true)}
          className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition"
        >
          Lämna omdöme
        </button>
      ) : null}

      {showReviewForm ? (
        <div className="bg-gray-50 rounded-2xl p-6 mt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ditt omdöme</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Betyg</label>
            <StarRating
              rating={newReview.rating}
              onRate={(rating) => setNewReview((prev) => ({ ...prev, rating }))}
              size="lg"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Kommentar (valfritt)</label>
            <textarea
              value={newReview.comment}
              onChange={(e) => setNewReview((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder="Berätta om din upplevelse..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {reviewError ? <p className="text-red-600 text-sm mb-4">{reviewError}</p> : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void submitReview()}
              disabled={submittingReview}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition disabled:opacity-50"
            >
              {submittingReview ? 'Skickar...' : 'Skicka omdöme'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReviewForm(false);
                setReviewError('');
                setNewReview({ rating: 0, comment: '' });
              }}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition"
            >
              Avbryt
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
