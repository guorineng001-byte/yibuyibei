import type {Chapter} from './types';
// Titles and printed page starts were checked against PDF pages 6–8.
const toc:[string,number][]=[
 ['中教 · 官学制度的建立与“六艺”教育的形成',3],
 ['中教 · 私人讲学的兴起与传统教育思想的奠基',5],
 ['中教 · 儒学独尊与读经做官教育模式的初步形成',25],
 ['中教 · 封建国家教育体制的完善',32],
 ['中教 · 理学教育思想和学校的改革与发展',42],
 ['中教 · 理学教育思想的批判与反思',55],
 ['中教 · 近代教育的起步',58],
 ['中教 · 近代教育体系的建立',63],
 ['中教 · 近代教育体制的变革',72],
 ['中教 · 南京国民政府时期的教育',83],
 ['中教 · 新民主主义教育的发展',86],
 ['中教 · 现代教育家的教育理论与实践',90],
 ['外教 · 东方文明古国的教育',106],
 ['外教 · 古希腊教育',108],
 ['外教 · 古罗马教育',115],
 ['外教 · 西欧中世纪教育',118],
 ['外教 · 文艺复兴与宗教改革时期的教育',121],
 ['外教 · 英国的近现代教育制度',125],
 ['外教 · 法国的近现代教育制度',133],
 ['外教 · 德国的近现代教育制度',139],
 ['外教 · 俄国（苏联）的近现代教育制度',145],
 ['外教 · 美国的近现代教育制度',151],
 ['外教 · 日本的近现代教育制度',158],
 ['外教 · 近现代重要的教育家（三星级教育家）',164],
 ['外教 · 近现代超级重量级教育家（五星级教育家）',172],
 ['外教 · 近现代教育思潮',197]
];
export const bookCatalog:Chapter[]=toc.map(([title,start],i)=>({id:`history-chapter-${i}`,bookId:'kaicheng-333-history',title,start:start+(i<12?8:7),end:i===11?111:Math.min(214,(toc[i+1]?.[1]??207)+(i<12?8:7)),order:i+1}));
export const historyPageLabels:Record<string,string>=Object.fromEntries(Array.from({length:215},(_,i)=>{const p=i+1;return [String(p),p>=10&&p<=111?String(p-8).padStart(3,'0'):p>=113&&p<=214?String(p-7).padStart(3,'0'):''];}));
