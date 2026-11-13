import type {AppState,Step,Knowledge} from './types';
import {bookCatalog,historyPageLabels} from './catalog';
import {bundledBooks,HISTORY_BOOK_ID} from './books';
const groups=[
 {id:'practice',title:'教育实践',rect:[0.19,0.118,0.68,0.058],steps:[['吕克昂学园','亚里士多德创建吕克昂学园，突出科研与教学相结合、研究与实验相结合、分班讲授与自由讨论相结合。','吕克昂学园,科研与教学,研究与实验,讲授与讨论']]},
 {id:'soul',title:'理论基础：灵魂论',rect:[0.19,0.176,0.70,0.141],steps:[['灵魂的三个层次','营养的灵魂对应植物的灵魂，感觉的灵魂对应动物的灵魂，理性的灵魂对应人的灵魂。营养与感觉属于非理性，理性的灵魂属于理性。','营养,感觉,理性'],['灵魂论的教育意义','人有动物性，人有理性；灵魂论为三育提供依据。','动物性,理性,三育']]},
 {id:'role',title:'教育作用',rect:[0.19,0.325,0.73,0.089],steps:[['个人作用','形成人的三个因素是天性、习惯和理性。理性要统率天性和习惯，通过教育来发展人的理性。','天性,习惯,理性'],['社会作用与评价','国家实行公共教育，并为教育立法。该观点富有远见，说明教育不是万能的。','公共教育,教育立法,不是万能的']]},
 {id:'moral',title:'道德教育',rect:[0.19,0.414,0.71,0.094],steps:[['中道','伦理美德就是“中道”。中道即中国的中庸之道，办事要适度，恰如其分，任何过多、过少都不好。','中道,适度,恰如其分'],['实践德行','强调实践德行。批判苏格拉底“知识即美德”的观点，注重道德动机与效果的统一。','实践德行,批判知识即美德,动机与效果']]},
 {id:'harmony',title:'和谐教育',rect:[0.19,0.507,0.72,0.075],steps:[['四育并举','体、德、智、美和谐发展：先体育，再德育，最后智育和美育。音乐教育是和谐教育的核心。通过“四育”并举，才能实现人的和谐发展。','体德智美,体育优先,音乐教育']]},
 {id:'nature',title:'自然教育',rect:[0.33,0.587,0.58,0.103],steps:[['教育要效法自然','亚里士多德首次明确提出教育要效法自然，并将其运用于年龄分期和谐教育。教育顺应人自身的自然，尊重儿童的个性与自由，以及儿童身心发展的规律。亚里士多德的教育思想是西方自然主义教育思想的源头。','效法自然,个性与自由,身心发展规律']]},
 {id:'age',title:'儿童年龄分期',rect:[0.33,0.713,0.60,0.116],steps:[['家庭教育：0～7岁','家庭教育阶段（0～7岁）：以体育和游戏为主，不主张学习知识内容。','0～7岁,体育和游戏'],['初等教育：7～14岁','初等教育阶段（7～14岁）：实施自由教育。','7～14岁,自由教育'],['高等教育：14～21岁','高等教育阶段（14～21岁）：注重哲学、科学、“后四艺”，与吕克昂学园的三结合教学实践相关联。','14～21岁,哲学科学,后四艺']]}
];
export function initialState():AppState{
 const knowledge:Knowledge[]=groups.map((g,i)=>({id:g.id,bookId:'kaicheng-333-history',chapterId:'history-chapter-13',section:'亚里士多德的教育思想',title:g.title,refs:[{page:121,rect:g.rect as [number,number,number,number]}],confirmed:true,selected:true,order:121000+i}));
 const steps:Step[]=groups.flatMap(g=>g.steps.map((t,i)=>({id:`${g.id}-${i}`,knowledgeId:g.id,title:t[0],text:t[1],keywords:t[2].split(','),order:i,version:1})));
 return {schemaVersion:1,books:[{...bundledBooks[HISTORY_BOOK_ID],pageLabels:historyPageLabels}],chapters:[...bookCatalog],knowledge,steps,progress:{},events:[],session:null,settings:{dailyNew:10,roundSize:5,encouragement:'full',examType:'333',targetSchool:'',intervals:[1,3,7,14]},ocr:{},assemblies:[],questions:[],essayPractice:{}};
}
