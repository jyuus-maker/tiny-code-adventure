// Pixelcode · RGBA palette, original grid coordinates
type PixelAsset = { id: string; name: string; row: number; col: number; width: number; height: number; pixels?: number[]; runs?: [number,number,number][] };
type PixelProjectData = {version: number; name: string; rows: number; columns: number; palette: number[][]; assets: PixelAsset[]};
export const project: PixelProjectData = {"version":2,"name":"새 픽셀 프로젝트","columns":6,"rows":8,"palette":[[0,0,0,0],[48,40,49,255]],"assets":[{"id":"3e72b7ef-293c-495e-ac4a-869132fdeaad","name":"eff-crack-64-v2.png","row":6,"col":3,"width":64,"height":64,"runs":[[803,1,1],[867,1,1],[930,1,1],[994,1,1],[1040,1,1],[1058,1,1],[1105,1,1],[1123,2,1],[1170,1,1],[1189,1,1],[1235,4,1],[1253,1,1],[1299,1,1],[1303,1,1],[1318,1,1],[1362,1,1],[1367,1,1],[1382,1,1],[1426,1,1],[1432,1,1],[1451,1,1],[1490,1,1],[1496,1,1],[1516,2,1],[1582,1,1],[1646,1,1],[1688,1,1],[1709,1,1],[1753,1,1],[1773,1,1],[1818,2,1],[1822,2,1],[1836,2,1],[1884,2,1],[1888,1,1],[1898,2,1],[1902,1,1],[1952,1,1],[1967,2,1],[1995,2,1],[2017,1,1],[2033,1,1],[2061,3,1],[2081,1,1],[2127,1,1],[2144,1,1],[2146,2,1],[2192,1,1],[2207,1,1],[2212,1,1],[2256,1,1],[2270,1,1],[2320,1,1],[2385,2,1],[2451,2,1],[2471,1,1],[2536,1,1],[2584,1,1],[2601,1,1],[2648,1,1],[2666,1,1],[2711,1,1],[2730,1,1],[2775,1,1],[2793,1,1],[2839,1,1],[2857,1,1],[2901,2,1],[2904,1,1],[2919,2,1],[2922,1,1],[2964,1,1],[2969,1,1],[2982,1,1],[2987,2,1],[3034,1,1],[3053,1,1],[3098,1,1],[3104,1,1],[3161,1,1],[3169,1,1],[3225,1,1],[3233,1,1],[3289,1,1],[3298,4,1],[3366,1,1],[3430,1,1],[3495,1,1]]}]};
export function getImage(row: number, col: number) { return project.assets.find(a => a.row === row && a.col === col); }
export function drawImage(ctx: CanvasRenderingContext2D, row: number, col: number, x = 0, y = 0) {
 const asset = getImage(row, col); if (!asset) return;
 const image = ctx.createImageData(asset.width, asset.height);
 if (asset.runs) { for (const [offset,length,index] of asset.runs) for(let i=offset;i<offset+length;i++) image.data.set(project.palette[index],i*4); }
 else asset.pixels?.forEach((index, i) => image.data.set(project.palette[index], i * 4));
 ctx.putImageData(image, x, y);
}
