export type PixelRun = [offset: number, length: number, paletteIndex: number];

export type PixelAsset = {
  id: string;
  name: string;
  row: number;
  col: number;
  width: number;
  height: number;
  pixels?: number[];
  runs?: PixelRun[];
};

export type PixelProjectData = {
  version: number;
  name: string;
  rows: number;
  columns: number;
  palette: number[][];
  assets: PixelAsset[];
};

export type PixelRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  p: number;
};

export type ItemGrade = 'shining' | 'normal' | 'broken';

export type RegisteredPixelAsset = {
  id: string;
  filename: string;
  assetCount: number;
  size: number;
  version: string | null;
  width: number;
  height: number;
  palette: number[][];
  runs: PixelRun[];
};


