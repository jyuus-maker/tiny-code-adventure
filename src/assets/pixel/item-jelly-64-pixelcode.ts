// Pixelcode · RGBA palette, original grid coordinates
type PixelAsset = { id: string; name: string; row: number; col: number; width: number; height: number; pixels?: number[]; runs?: [number,number,number][] };
type PixelProjectData = {version: number; name: string; rows: number; columns: number; palette: number[][]; assets: PixelAsset[]};
export const project: PixelProjectData = {"version":2,"name":"새 픽셀 프로젝트","columns":6,"rows":4,"palette":[[0,0,0,0],[53,78,57,255],[121,170,89,255],[195,216,135,255]],"assets":[{"id":"627cde12-333c-4a48-8b95-2213f1584c0b","name":"item-jelly-64.png","row":2,"col":5,"width":64,"height":64,"runs":[[1245,1,1],[1308,7,1],[1370,15,1],[1433,17,1],[1495,7,1],[1502,1,2],[1503,11,1],[1558,7,1],[1565,6,2],[1571,8,1],[1622,6,1],[1628,12,2],[1640,4,1],[1686,4,1],[1690,3,2],[1693,8,3],[1701,3,2],[1704,4,1],[1749,4,1],[1753,3,2],[1756,8,3],[1764,5,2],[1769,4,1],[1813,4,1],[1817,3,2],[1820,8,3],[1828,5,2],[1833,5,1],[1877,4,1],[1881,2,2],[1883,8,3],[1891,7,2],[1898,4,1],[1941,4,1],[1945,2,2],[1947,7,3],[1954,8,2],[1962,5,1],[2005,4,1],[2009,1,2],[2010,6,3],[2016,11,2],[2027,6,1],[2068,4,1],[2072,6,2],[2078,1,3],[2079,12,2],[2091,7,1],[2132,4,1],[2136,20,2],[2156,8,1],[2196,4,1],[2200,20,2],[2220,10,1],[2257,7,1],[2264,22,2],[2286,8,1],[2318,10,1],[2328,25,2],[2353,6,1],[2381,8,1],[2389,30,2],[2419,4,1],[2445,5,1],[2450,33,2],[2483,4,1],[2508,5,1],[2513,35,2],[2548,3,1],[2572,4,1],[2576,36,2],[2612,4,1],[2635,4,1],[2639,37,2],[2676,4,1],[2699,3,1],[2702,39,2],[2741,3,1],[2762,3,1],[2765,40,2],[2805,4,1],[2826,5,1],[2831,37,2],[2868,5,1],[2889,7,1],[2896,34,2],[2930,6,1],[2954,8,1],[2962,31,2],[2993,6,1],[3020,7,1],[3027,29,2],[3056,6,1],[3085,8,1],[3093,1,2],[3094,32,1],[3151,38,1],[3216,36,1],[3282,33,1],[3347,1,1]]}]};
export function getImage(row: number, col: number) { return project.assets.find(a => a.row === row && a.col === col); }
export function drawImage(ctx: CanvasRenderingContext2D, row: number, col: number, x = 0, y = 0) {
 const asset = getImage(row, col); if (!asset) return;
 const image = ctx.createImageData(asset.width, asset.height);
 if (asset.runs) { for (const [offset,length,index] of asset.runs) for(let i=offset;i<offset+length;i++) image.data.set(project.palette[index],i*4); }
 else asset.pixels?.forEach((index, i) => image.data.set(project.palette[index], i * 4));
 ctx.putImageData(image, x, y);
}
