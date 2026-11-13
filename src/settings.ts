import type {StudySettings} from './types';
export function normalizeSettings(settings:StudySettings):StudySettings {
 return {...settings,examType:settings.examType==='311'?'311':'333',targetSchool:settings.targetSchool?.trim()??'',encouragement:settings.encouragement==='brief'?'brief':'full'};
}
export const examSubjects={
 '333':['教育学原理','中国教育史','外国教育史','教育心理学'],
 '311':['教育学原理','中国教育史','外国教育史','教育心理学','教育研究方法'],
};
