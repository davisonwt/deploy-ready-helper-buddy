import { describe, it, expect } from 'vitest';
import { resolveShelfSubset, describeUnplacedSeeds } from '@/lib/stalls/shelfSeeds';
import type { TileKind } from '@/lib/stalls/stallTypes';

/**
 * The per-hotspot subset contract. Every rule here is one an owner can see
 * on her own stall, so each test is named as the thing she would notice.
 */
const seed = (id: string) => ({ id });
const SEEDS = ['a', 'b', 'c', 'd'].map(seed);
const box = (id: string, seed_ids?: string[], kind: TileKind = 'books') => ({ id, kind, seed_ids, label: id });

describe('resolveShelfSubset', () => {
  it('an untouched box opens everything of its kind -- no stall changes until an owner curates', () => {
    const boxes = [box('h1'), box('h2'), box('h3')];
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h1').map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('two boxes of the same kind open DIFFERENT finds -- the payoff', () => {
    const boxes = [box('h1', ['a', 'b']), box('h2', ['c']), box('h3')];
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h1').map((s) => s.id)).toEqual(['a', 'b']);
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h2').map((s) => s.id)).toEqual(['c']);
  });

  it('the still-uncurated third box keeps showing all of them', () => {
    const boxes = [box('h1', ['a', 'b']), box('h2', ['c']), box('h3')];
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h3').map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('one seed may sit in several boxes at once -- same-kind repeats are the point', () => {
    const boxes = [box('h1', ['a', 'b']), box('h2', ['a', 'c']), box('h3')]; // h3 open, so rule 4 stays out of it
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h1').map((s) => s.id)).toEqual(['a', 'b']);
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h2').map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('keeps the newest-first order it was given rather than the order they were picked', () => {
    const boxes = [box('h1', ['d', 'a']), box('h2')]; // h2 open, so rule 4 stays out of it
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h1').map((s) => s.id)).toEqual(['a', 'd']);
  });

  it('a deleted seed just is not there -- never an error', () => {
    const boxes = [box('h1', ['a', 'gone-with-the-product']), box('h2')];
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h1').map((s) => s.id)).toEqual(['a']);
  });

  it('a box whose every seed was deleted falls back to showing the shelf, not an empty room', () => {
    const boxes = [box('h1', ['deleted-1', 'deleted-2']), box('h2')];
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h1').map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('a hotspot deleted out from under the URL opens the first of its kind, not nothing', () => {
    const boxes = [box('h1', ['a']), box('h2', ['b'])];
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'no-such-box').map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('a seed on no box stays reachable once EVERY box of its kind is curated', () => {
    const boxes = [box('h1', ['a']), box('h2', ['b'])];
    // c and d are on neither -- they join the first curated box, not limbo.
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h1').map((s) => s.id)).toEqual(['a', 'c', 'd']);
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h2').map((s) => s.id)).toEqual(['b']);
  });

  it('but does not double up while any box of the kind is still open', () => {
    const boxes = [box('h1', ['a']), box('h2')];
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h1').map((s) => s.id)).toEqual(['a']);
  });

  it('another kind’s boxes never affect this one', () => {
    const boxes = [box('h1', ['a']), box('m1', ['b'], 'music')];
    // h1 is the only books box and it is curated, so b/c/d fall to it.
    expect(resolveShelfSubset(SEEDS, boxes, 'books', 'h1').map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('no hotspot id at all (an old deep link) opens everything', () => {
    expect(resolveShelfSubset(SEEDS, [box('h1', ['a'])], 'books', null).map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('describeUnplacedSeeds', () => {
  it('says nothing while an uncurated box is still showing everything', () => {
    const r = describeUnplacedSeeds(SEEDS, [box('h1', ['a']), box('h2')], 'books');
    expect(r.host).toBeNull();
  });

  it('names the box that will hold the leftovers once every box is curated', () => {
    const r = describeUnplacedSeeds(SEEDS, [box('h1', ['a']), box('h2', ['b'])], 'books');
    expect(r.unplaced.map((s) => s.id)).toEqual(['c', 'd']);
    expect(r.host?.id).toBe('h1');
  });

  it('agrees with what the visitor actually sees', () => {
    const boxes = [box('h1', ['a']), box('h2', ['b'])];
    const r = describeUnplacedSeeds(SEEDS, boxes, 'books');
    const shown = resolveShelfSubset(SEEDS, boxes, 'books', r.host!.id).map((s) => s.id);
    for (const u of r.unplaced) expect(shown).toContain(u.id);
  });
});
