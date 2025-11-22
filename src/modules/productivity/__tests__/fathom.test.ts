import { describe, it, expect } from 'vitest';
import * as fathom from '../fathom';

describe('Fathom Module', () => {
  it('should export listMeetings function', () => {
    expect(fathom.listMeetings).toBeDefined();
    expect(typeof fathom.listMeetings).toBe('function');
  });

  it('should export getTranscript function', () => {
    expect(fathom.getTranscript).toBeDefined();
    expect(typeof fathom.getTranscript).toBe('function');
  });

  it('should export getSummary function', () => {
    expect(fathom.getSummary).toBeDefined();
    expect(typeof fathom.getSummary).toBe('function');
  });

  it('should export searchMeetings function', () => {
    expect(fathom.searchMeetings).toBeDefined();
    expect(typeof fathom.searchMeetings).toBe('function');
  });
});
