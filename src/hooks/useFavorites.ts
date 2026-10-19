import { useState } from 'react';

// Избранные матчи (по id). Хранятся только в памяти, пока открыто приложение.
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  const isFavorite = (id: string) => favorites.includes(id);

  const toggle = (id: string) => {
    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((favoriteId) => favoriteId !== id)
        : [...previous, id],
    );
  };

  return { favorites, isFavorite, toggle };
}
