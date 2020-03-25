import { FieldBuffer } from '../types';

interface ProcessedData {
  perUserRoute: { [key: string]: [number, number][] };
  perUserRouteRadius: { [key: string]: number[] };
  perUserVendorName: { [key: string]: string };
}

export const processReceivedData = (length: number, fields: FieldBuffer[]): ProcessedData => {
  const perUserRoute: { [key: string]: [number, number][] } = {};
  const perUserRouteRadius: { [key: string]: number[] } = {};
  const perUserVendorName: { [key: string]: string } = {};

  for (let i = 0; i < length; i++) {
    (perUserRoute[fields[0].values.buffer[i]] = perUserRoute[fields[0].values.buffer[i]] || []).push([
      fields[2].values.buffer[i],
      fields[1].values.buffer[i],
    ]);

    (perUserRouteRadius[fields[0].values.buffer[i]] = perUserRouteRadius[fields[0].values.buffer[i]] || []).push(fields[3].values.buffer[i]);

    !perUserVendorName[fields[0].values.buffer[i]] ? (perUserVendorName[fields[0].values.buffer[i]] = fields[4].values.buffer[i]) : null;
  }
  return { perUserRoute, perUserRouteRadius, perUserVendorName };
};
