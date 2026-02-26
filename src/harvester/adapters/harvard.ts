import { ArchiveItem } from '../types.js';

export const harvardAdapter = (raw: any): ArchiveItem => ({
  id:             `harvard-${raw.id}`,
  title:          raw.title || 'Untitled',
  // people[] can have multiple entries — find the primary artist role
  author:         raw.people?.find((p: any) => p.role === 'Artist')?.name
                  || raw.people?.[0]?.name
                  || 'Unknown',
  year:           raw.dated || 'n.d.',
  imageUrl:       raw.primaryimageurl || '',
  source:         'Harvard Art Museums',
  link:           raw.url || '',
  department:     raw.division || raw.department || 'Harvard',
  classification: raw.classification || 'Unknown',
  medium:         raw.medium || 'Unknown',
  culture:        raw.culture || 'Unknown',
});