export interface ApprovedTestimonial {
  id: string;
  body: string;
  createdAt: Date;
  authorDisplay: string;
  authorPhotoUrl: string | null;
  authorIsVip: boolean;
  masterId: string;
}
