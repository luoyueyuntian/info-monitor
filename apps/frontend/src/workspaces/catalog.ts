import type { WorkspaceDefinition, WorkspaceModule } from "./types";

export const workspaceDefinitions: WorkspaceDefinition[] = [
  {
    id: "market-impact",
    label: "金融市场影响",
    shortLabel: "金融",
    description: "跟踪宏观数据、官方公告、政策与市场价格联动，帮助你判断对股市和资产定价的影响。",
    summary: "宏观数据、官方公告、政策与市场联动",
    emptyTitle: "这个工作区还没有接入金融类主题",
    emptyBody: "接入统计局、央行、交易所、行情和政策类来源后，这里会形成完整的金融市场工作台。",
  },
  {
    id: "stock-market",
    label: "股市",
    shortLabel: "股市",
    description: "集中查看 A股、港股、指数、个股价格和跨境资金流向，形成独立的日度行情工作区。",
    summary: "A股、港股、指数、个股价格与资金流向",
    emptyTitle: "这个工作区还没有接入股市主题",
    emptyBody: "接入 A股、港股、指数、个股和资金流来源后，这里会成为你的独立股市工作台。",
  },
  {
    id: "goods-supply",
    label: "商品价格与供需",
    shortLabel: "商品",
    description: "跟踪新品、二手商品、库存与供给变化，帮助你把价格和供需信号收敛成一套稳定工作流。",
    summary: "新品、二手、库存、价格波动与供需变化",
    emptyTitle: "这个工作区还没有接入商品价格主题",
    emptyBody: "接入电商、二手平台和库存来源后，这里会沉淀价格波动、供需异常和买卖窗口。",
  },
  {
    id: "competitor-watch",
    label: "竞品与产品动作",
    shortLabel: "竞品",
    description: "实时跟踪竞品的功能更新、发版、活动与内容动作，帮助产品和运营团队及时做出反应。",
    summary: "竞品发版、功能、活动、内容与渠道动作",
    emptyTitle: "这个工作区还没有接入竞品主题",
    emptyBody: "接入官网、社媒、Release Notes 和社区来源后，这里会成为你的竞品行动雷达。",
  },
];

function createGenericSections(workspaceLabel: string): WorkspaceModule["sections"] {
  return {
    dashboard: {
      id: "dashboard",
      label: "大盘",
      description: `${workspaceLabel}的整体概览、优先级和最新变化。`,
    },
    actions: {
      id: "actions",
      label: "动作",
      description: `${workspaceLabel}当前需要优先处理的动作与判断项。`,
    },
    topics: {
      id: "topics",
      label: "主题",
      description: `${workspaceLabel}下按主题组织的观察对象与脉络。`,
    },
    sources: {
      id: "sources",
      label: "来源",
      description: `${workspaceLabel}相关来源、渠道与运行状态。`,
    },
    reports: {
      id: "reports",
      label: "报告",
      description: `${workspaceLabel}的汇总报告与阶段性复盘。`,
    },
  };
}

export const workspaceModulesCatalog: WorkspaceModule[] = [
  {
    definition: workspaceDefinitions[0],
    sections: createGenericSections(workspaceDefinitions[0].label),
  },
  {
    definition: workspaceDefinitions[1],
    sections: {
      dashboard: {
        id: "dashboard",
        label: "大盘",
        description: "股市工作区的市场总览与复盘入口。",
      },
      actions: {
        id: "actions",
        label: "动作",
        description: "股市工作区需要优先判断的异动动作与调查动作。",
      },
      topics: {
        id: "topics",
        label: "主题",
        description: "股市工作区的市场总览、公告与异动主题。",
      },
      sources: {
        id: "sources",
        label: "来源",
        description: "股市工作区的行情、公告与渠道来源控制台。",
      },
      reports: {
        id: "reports",
        label: "报告",
        description: "股市工作区的盘后报告、连续复盘与市场故事。",
      },
    },
  },
  {
    definition: workspaceDefinitions[2],
    sections: createGenericSections(workspaceDefinitions[2].label),
  },
  {
    definition: workspaceDefinitions[3],
    sections: {
      dashboard: {
        id: "dashboard",
        label: "大盘",
        description: "竞品工作区的动作雷达、活跃对象和优先级总览。",
      },
      actions: {
        id: "actions",
        label: "动作",
        description: "竞品工作区的分诊台，用来先判断变化类型和影响范围。",
      },
      topics: {
        id: "topics",
        label: "主题",
        description: "竞品工作区的画像墙，按对象沉淀长期观察脉络。",
      },
      sources: {
        id: "sources",
        label: "来源",
        description: "竞品工作区的来源台，优先识别哪些渠道需要先验证。",
      },
      reports: {
        id: "reports",
        label: "报告",
        description: "竞品工作区的情报摘要与阶段性动作复盘。",
      },
    },
  },
];
