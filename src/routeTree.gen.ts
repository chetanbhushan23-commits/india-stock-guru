/* eslint-disable */
// @ts-nocheck
// This checked-in copy is updated so the new route is available immediately.
import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as StockSymbolRouteImport } from './routes/stock.$symbol'
import { Route as AiAssistantRouteImport } from './routes/ai-assistant'
import { Route as StockChatRouteImport } from './routes/stock-chat'
import { Route as StockChatSymbolRouteImport } from './routes/stock-chat.$symbol'
import { Route as ResearchHistoryRouteImport } from './routes/research-history'
import { Route as ResearchRouteImport } from './routes/research'
const IndexRoute = IndexRouteImport.update({ id:'/', path:'/', getParentRoute:()=>rootRouteImport } as any)
const StockSymbolRoute = StockSymbolRouteImport.update({ id:'/stock/$symbol', path:'/stock/$symbol', getParentRoute:()=>rootRouteImport } as any)
const AiAssistantRoute = AiAssistantRouteImport.update({ id:'/ai-assistant', path:'/ai-assistant', getParentRoute:()=>rootRouteImport } as any)
const StockChatRoute = StockChatRouteImport.update({ id:'/stock-chat', path:'/stock-chat', getParentRoute:()=>rootRouteImport } as any)
const StockChatSymbolRoute = StockChatSymbolRouteImport.update({ id:'/stock-chat/$symbol', path:'/stock-chat/$symbol', getParentRoute:()=>rootRouteImport } as any)
const ResearchHistoryRoute = ResearchHistoryRouteImport.update({ id:'/research-history', path:'/research-history', getParentRoute:()=>rootRouteImport } as any)
const ResearchRoute = ResearchRouteImport.update({ id:'/research', path:'/research', getParentRoute:()=>rootRouteImport } as any)
export interface FileRoutesByFullPath { '/':typeof IndexRoute; '/stock/$symbol':typeof StockSymbolRoute; '/ai-assistant':typeof AiAssistantRoute; '/stock-chat':typeof StockChatRoute; '/stock-chat/$symbol':typeof StockChatSymbolRoute; '/research-history':typeof ResearchHistoryRoute; '/research':typeof ResearchRoute }
export interface FileRoutesByTo extends FileRoutesByFullPath {}
export interface FileRouteTypes { fileRoutesByFullPath:FileRoutesByFullPath; fullPaths:'/'|'/stock/$symbol'|'/ai-assistant'|'/stock-chat'|'/stock-chat/$symbol'|'/research-history'|'/research'; fileRoutesByTo:FileRoutesByTo; to:FileRouteTypes['fullPaths']; id:'__root__'|FileRouteTypes['fullPaths']; fileRoutesById:FileRoutesByFullPath }
declare module '@tanstack/react-router' { interface FileRoutesByPath { '/research':{ id:'/research'; path:'/research'; fullPath:'/research'; preLoaderRoute:typeof ResearchRouteImport; parentRoute:typeof rootRouteImport } } }
const rootRouteChildren = { IndexRoute, StockSymbolRoute, AiAssistantRoute, StockChatRoute, StockChatSymbolRoute, ResearchHistoryRoute, ResearchRoute }
export const routeTree = rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>()
