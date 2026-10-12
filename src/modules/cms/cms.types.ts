export interface CmsPage {
  id: string;
  page_slug: string;
  page_title: string;
  meta_title?: string | null;
  meta_description?: string | null;
  is_published: number;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsSection {
  id: string;
  page_slug: string;
  section_key: string;
  section_title?: string | null;
  content_json: any;
  is_active: number;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsGalleryItem {
  id: string;
  title: string;
  category: string;
  image_url: string;
  captured_date?: string | null;
  display_order: number;
  is_published: number;
  created_at: string;
  updated_at: string;
}

export interface CmsPageBundle {
  page: CmsPage;
  sections: Record<string, any>;
}
