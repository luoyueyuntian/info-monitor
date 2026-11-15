import type { FastifyInstance } from 'fastify';
import { getContentDetail,listContent,type ContentQuery } from '../services/content-service.js';
import { getRecordArticle } from '../services/article-service.js';
export async function registerContentRoutes(app:FastifyInstance) {
  app.get<{Querystring:ContentQuery}>('/api/content',{
    schema:{querystring:{type:'object',additionalProperties:false,anyOf:[{required:['sourceId']},{required:['themeId']}],properties:{
      sourceId:{type:'string',minLength:1,maxLength:4000},themeId:{type:'string',minLength:1,maxLength:4000},
      q:{type:'string',maxLength:200},page:{type:'integer',minimum:1,maximum:100000},limit:{type:'integer',minimum:1,maximum:50},
    }}},
  },async request=>listContent(request.query));
  app.get<{Params:{recordId:string}}>('/api/content/:recordId',async(request,reply)=>{
    const result=await getContentDetail(request.params.recordId);
    if(!result){reply.code(404);return {message:'Content not found'};}return result;
  });
  app.get<{Params:{recordId:string}}>('/api/content/:recordId/article',async(request,reply)=>{
    const result=await getRecordArticle(request.params.recordId);
    if(!result){reply.code(404);return {message:'Content not found'};}return result;
  });
  app.post<{Params:{recordId:string};Body:{retry?:boolean}}>('/api/content/:recordId/article',{
    schema:{body:{type:'object',additionalProperties:false,properties:{retry:{type:'boolean'}}}},
  },async(request,reply)=>{
    const result=await getRecordArticle(request.params.recordId,{request:true,retry:request.body?.retry});
    if(!result){reply.code(404);return {message:'Content not found'};}return result;
  });
}
