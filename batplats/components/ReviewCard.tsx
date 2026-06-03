'use client';

import { StarRating } from './StarRating';

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  host_response: string | null;
  created_at: string;
  reviewer_name: string;
};

export function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="border-b border-gray-100 py-6 last:border-0">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-sm">
          {review.reviewer_name?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div>
          <p className="font-medium text-gray-900">{review.reviewer_name || 'Anonym'}</p>
          <p className="text-sm text-gray-500">
            {new Date(review.created_at).toLocaleDateString('sv-SE', {
              year: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      </div>

      <StarRating rating={review.rating} readonly size="sm" />

      {review.comment ? (
        <p className="mt-3 text-gray-700 leading-relaxed">{review.comment}</p>
      ) : null}

      {review.host_response ? (
        <div className="mt-4 bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-900 mb-1">Svar från värden</p>
          <p className="text-sm text-gray-700">{review.host_response}</p>
        </div>
      ) : null}
    </div>
  );
}
