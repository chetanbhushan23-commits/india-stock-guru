/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols
import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as StockSymbolRouteImport } from './routes/stock.$symbol'
import { Route as AiAssistantRouteImport } from './routes/ai-assistant'
import { Route as StockChatRouteImport } from './routes/stock-chat'
import { Route as StockChatSymbolRouteImport } from './routes/stock-chat.$symbol'
import { Route as ResearchHistoryRouteImport } from './routes/research-history'
import { Route as ResearchRouteImport } from './routes/research'
import { Route as EvidenceRouteImport } from './routes/evidence'
import { Route as CompareRouteImport } from './routes/compare'
import { Route as PortfolioIntelligenceRouteImport } from './routes/portfolio-intelligence'
import { Route as ResearchAlertsRouteImport } from './routes/research-alerts'
import { Route as ResearchReportRouteImport } from './routes/research-report'
import { Route as ResearchWatchlistRouteImport } from './routes/research-watchlist'
import { Route as ResearchTimelineRouteImport } from './routes/research-timeline'
import { Route as AIResearchCommandCenterRouteImport } from './routes/ai-research-command-center'
const IndexRoute = IndexRouteImport.update({id:'/',path:'/',getParentRoute:()=>rootRouteImport} as any)
const StockSymbolRoute = StockSymbolRouteImport.update({id:'/stock/$symbol',path:'/stock/$symbol',getParentRoute:()=>rootRouteImport} as any)
const AiAssistantRoute = AiAssistantRouteImport.update({id:'/ai-assistant',path:'/ai-assistant',getParentRoute:()=>rootRouteImport} as any)
const StockChatRoute = StockChatRouteImport.update({id:'/stock-chat',path:'/stock-chat',getParentRoute:()=>rootRouteImport} as any)
const StockChatSymbolRoute = StockChatSymbolRouteImport.update({id:'/stock-chat/$symbol',path:'/stock-chat/$symbol',getParentRoute:()=>rootRouteImport} as any)
const ResearchHistoryRoute = ResearchHistoryRouteImport.update({id:'/research-history',path:'/research-history',getParentRoute:()=>rootRouteImport} as any)
const ResearchRoute = ResearchRouteImport.update({id:'/research',path:'/research',getParentRoute:()=>rootRouteImport} as any)
const EvidenceRoute = EvidenceRouteImport.update({id:'/evidence',path:'/evidence',getParentRoute:()=>rootRouteImport} as any)
const CompareRoute = CompareRouteImport.update({id:'/compare',path:'/compare',getParentRoute:()=>rootRouteImport} as any)
const PortfolioIntelligenceRoute = PortfolioIntelligenceRouteImport.update({id:'/portfolio-intelligence',path:'/portfolio-intelligence',getParentRoute:()=>rootRouteImport} as any)
const ResearchAlertsRoute = ResearchAlertsRouteImport.update({id:'/research-alerts',path:'/research-alerts',getParentRoute:()=>rootRouteImport} as any)
const ResearchReportRoute = ResearchReportRouteImport.update({id:'/research-report',path:'/research-report',getParentRoute:()=>rootRouteImport} as any)
const ResearchWatchlistRoute = ResearchWatchlistRouteImport.update({id:'/research-watchlist',path:'/research-watchlist',getParentRoute:()=>rootRouteImport} as any)
const ResearchTimelineRoute = ResearchTimelineRouteImport.update({id:'/research-timeline',path:'/research-timeline',getParentRoute:()=>rootRouteImport} as any)
const AIResearchCommandCenterRoute = AIResearchCommandCenterRouteImport.update({id:'/ai-research-command-center',path:'/ai-research-command-center',getParentRoute:()=>rootRouteImport} as any)
export interface FileRoutesByFullPath { '/':typeof IndexRoute; '/stock/$symbol':typeof StockSymbolRoute; '/ai-assistant':typeof AiAssistantRoute; '/stock-chat':typeof StockChatRoute; '/stock-chat/$symbol':typeof StockChatSymbolRoute; '/research-history':typeof ResearchHistoryRoute; '/research':typeof ResearchRoute; '/evidence':typeof EvidenceRoute; '/compare':typeof CompareRoute; '/portfolio-intelligence':typeof PortfolioIntelligenceRoute; '/research-alerts':typeof ResearchAlertsRoute; '/research-report':typeof ResearchReportRoute; '/research-watchlist':typeof ResearchWatchlistRoute; '/research-timeline':typeof ResearchTimelineRoute; '/ai-research-command-center':typeof AIResearchCommandCenterRoute }
export interface FileRoutesByTo extends FileRoutesByFullPath {}
export interface FileRouteTypes { fileRoutesByFullPath:FileRoutesByFullPath; fullPaths:'/'|'/stock/$symbol'|'/ai-assistant'|'/stock-chat'|'/stock-chat/$symbol'|'/research-history'|'/research'|'/evidence'|'/compare'|'/portfolio-intelligence'|'/research-alerts'|'/research-report'|'/research-watchlist'|'/research-timeline'|'/ai-research-command-center'; fileRoutesByTo:FileRoutesByTo; to:FileRouteTypes['fullPaths']; id:'__root__'|FileRouteTypes['fullPaths']; fileRoutesById:FileRoutesByFullPath }
declare module '@tanstack/react-router' { interface FileRoutesByPath { '/research-alerts':{id:'/research-alerts';path:'/research-alerts';fullPath:'/research-alerts';preLoaderRoute:typeof ResearchAlertsRouteImport;parentRoute:typeof rootRouteImport}; '/research-report':{id:'/research-report';path:'/research-report';fullPath:'/research-report';preLoaderRoute:typeof ResearchReportRouteImport;parentRoute:typeof rootRouteImport}; '/research-watchlist':{id:'/research-watchlist';path:'/research-watchlist';fullPath:'/research-watchlist';preLoaderRoute:typeof ResearchWatchlistRouteImport;parentRoute:typeof rootRouteImport}; '/research-timeline':{id:'/research-timeline';path:'/research-timeline';fullPath:'/research-timeline';preLoaderRoute:typeof ResearchTimelineRouteImport;parentRoute:typeof rootRouteImport}; '/ai-research-command-center':{id:'/ai-research-command-center';path:'/ai-research-command-center';fullPath:'/ai-research-command-center';preLoaderRoute:typeof AIResearchCommandCenterRouteImport;parentRoute:typeof rootRouteImport} } }
const rootRouteChildren = { IndexRoute, StockSymbolRoute, AiAssistantRoute, StockChatRoute, StockChatSymbolRoute, ResearchHistoryRoute, ResearchRoute, EvidenceRoute, CompareRoute, PortfolioIntelligenceRoute, ResearchAlertsRoute, ResearchReportRoute, ResearchWatchlistRoute, ResearchTimelineRoute, AIResearchCommandCenterRoute }
export const routeTree = rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>()
