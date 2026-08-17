import { describe, it, expect } from 'vitest';
import { ITEM_CATEGORIES } from '@/constants';
import { migrateGameData, createDefaultGame, ItemCategory } from '@/types';

describe('item categories', () => {
  it('presents the salvage taxonomy first', () => {
    expect(ITEM_CATEGORIES.slice(0, 4)).toEqual(['costume', 'prop', 'knowledge', 'gear']);
  });

  it('keeps every original trunk category valid', () => {
    for (const legacy of ['weapon', 'armor', 'consumable', 'key', 'misc'] as const) {
      expect(ITEM_CATEGORIES).toContain(legacy);
      // Compile-time check: legacy values are assignable to ItemCategory
      const c: ItemCategory = legacy;
      expect(c).toBe(legacy);
    }
  });

  it('migration leaves item categories untouched (old saves keep loading)', () => {
    const data = {
      ...createDefaultGame(),
      items: [
        { id: 'i1', name: 'Sword', category: 'weapon' as const, acquisition: 'earned' as const, effects: [] },
        { id: 'i2', name: 'Crazy Table', category: 'prop' as const, acquisition: 'pickup' as const, effects: [] },
      ],
    };
    const migrated = migrateGameData(data);
    expect(migrated.items.map(i => i.category)).toEqual(['weapon', 'prop']);
  });
});
