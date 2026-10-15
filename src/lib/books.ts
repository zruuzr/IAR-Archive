/* ============================================================
   IAR Archive — Book Data Types and Helpers
   ============================================================ */

import rawBooks from '../../books.json';

export interface Book {
  id: number;
  title: string;
  title_en?: string;
  author: string;
  author_en?: string;
  category: string;
  category_en?: string;
  description: string;
  description_en?: string;
  publisher?: string;
  publisher_en?: string;
  type?: string;
  type_en?: string;
  year?: string;
  pages?: string;
  file_size?: string;
  featured?: boolean;
  cover_image?: string;
  file_path?: string;
  file_name?: string;
  target_audience?: string;
  target_audience_en?: string;
  badge_text?: string;
  badge_text_en?: string;
  keywords?: string[];
  keywords_en?: string[];
  key_points?: string[];
  key_points_en?: string[];
}

export function getAllBooks(): Book[] {
  return rawBooks as Book[];
}

export function getFeaturedBook(): Book | undefined {
  const books = getAllBooks();
  return books.find((b) => b.featured) || books[0];
}

export function getCategoriesWithCounts(): { name: string; count: number }[] {
  const books = getAllBooks();
  const counts = new Map<string, number>();

  books.forEach((b) => {
    const cat = b.category || 'عام';
    counts.set(cat, (counts.get(cat) || 0) + 1);
  });

  return Array.from(counts.entries()).map(([name, count]) => ({
    name,
    count
  }));
}
