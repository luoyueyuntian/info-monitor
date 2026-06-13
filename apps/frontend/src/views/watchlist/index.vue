<template>
  <section class="flex flex-col gap-5">
    <header>
      <h2 class="mb-2 text-[1.8rem] font-semibold text-ink">观察清单</h2>
      <p class="m-0 leading-7 text-[#675d4f]">把已经进入长期观察的主题和事件沉淀成固定工作区，支持阶段性复盘和持续跟踪。</p>
    </header>

    <section class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-ink-label">快速视角</span>
        <button
          v-for="preset in phasePresets"
          :key="preset.id"
          class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50"
          :class="activePhasePresetId === preset.id ? 'border-[#2f2618] bg-btn-dark text-ink-on-dark hover:bg-btn-dark' : ''"
          @click="applyPhasePreset(preset)"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="text-[0.88rem] text-ink-secondary">{{ filterSummary }}</div>
    </section>

    <section class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
      <div class="flex flex-wrap items-center gap-3">
        <input
          v-model="query"
          class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5"
          placeholder="搜索收藏主题或事件..."
        />
        <select v-model="stageFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部阶段</option>
          <option value="recent">最近新加入观察</option>
          <option value="steady">持续跟踪中</option>
        </select>
        <select v-model="typeFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部类型</option>
          <option value="price">价格</option>
          <option value="content_update">内容更新</option>
          <option value="news_announcement">公告</option>
          <option value="financial_event">金融事件</option>
        </select>
        <select v-model="impactFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部影响</option>
          <option value="positive">偏利好</option>
          <option value="negative">偏利空</option>
          <option value="neutral">中性</option>
        </select>
        <select v-model="completionFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部完成度</option>
          <option value="pending">仍待复盘</option>
          <option value="completed">已完成首轮复盘</option>
        </select>
        <select v-model="reviewStatusFilter" class="rounded-xl border border-slate-400/20 bg-white/95 px-3 py-2.5">
          <option value="all">全部复盘状态</option>
          <option value="pending_review">待审核</option>
          <option value="reviewed">已审核</option>
          <option value="tracking">跟踪中</option>
          <option value="none">未设置</option>
        </select>
        <label class="flex items-center gap-2.5 font-semibold">
          <input v-model="unreadOnly" type="checkbox" />
          只看仍有未读内容
        </label>
      </div>
      <div class="text-[0.88rem] text-ink-secondary">
        当前视角下有 {{ filteredThemes.length }} 个收藏主题、{{ filteredEvents.length }} 条收藏事件。
      </div>
    </section>

    <section class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
      <div class="flex flex-wrap items-center gap-2.5 text-[#625847]">
        <strong>当前筛选</strong>
        <span>{{ filterSummary }}</span>
      </div>
      <div class="flex flex-wrap gap-3">
        <button
          v-if="query"
          class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
          @click="query = ''"
        >
          清空搜索
        </button>
        <button
          class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
          @click="resetFilters"
        >
          重置筛选
        </button>
      </div>
    </section>

    <div class="text-[0.92rem] leading-7 text-ink-body">
      {{ stageSummary }}
    </div>

    <section class="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
      <span class="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-ink-label">阶段快捷切换</span>
      <button
        v-for="preset in phasePresets"
        :key="preset.id"
        class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50"
        :class="isActivePhasePreset(preset) ? 'border-[#2f2618] bg-btn-dark text-ink-on-dark hover:bg-btn-dark' : ''"
        @click="applyPhasePreset(preset)"
      >
        {{ preset.label }}
      </button>
    </section>

    <section
      v-if="watchlistSections.length"
      class="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]"
    >
      <span class="text-[0.82rem] font-bold uppercase tracking-[0.06em] text-ink-label">页内导航</span>
      <button
        v-for="section in watchlistSections"
        :key="section.id"
        class="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-ink transition-colors hover:bg-slate-50"
        @click="scrollToSection(section.id)"
      >
        {{ section.label }}
      </button>
    </section>

    <article
      v-if="operationNotice"
      class="rounded-[18px] border border-slate-400/15 bg-white/78 p-[18px] shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
    >
      <strong class="block text-base font-semibold text-ink-heading">操作结果</strong>
      <div class="mt-2 text-ink-body">{{ operationNotice.message }}</div>
      <div v-if="operationNotice.actions.length" class="mt-3 flex flex-wrap gap-3">
        <RouterLink
          v-for="action in operationNotice.actions"
          :key="action.label"
          class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/15 bg-white/70 px-4 py-2.5 font-semibold text-slate-700 transition-colors hover:bg-white/90"
          :to="action.to"
        >
          {{ action.label }}
        </RouterLink>
      </div>
    </article>

    <section
      v-if="filteredEvents.length"
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]"
    >
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2.5 font-semibold">
          <input
            :checked="allVisibleSelected"
            type="checkbox"
            @change="toggleSelectAllVisible(($event.target as HTMLInputElement).checked)"
          />
          选中当前筛选事件
        </label>
        <span class="text-[0.88rem] text-ink-secondary">已选 {{ selectedEventIds.length }} 条事件</span>
      </div>
      <div class="flex flex-wrap gap-3">
        <button
          class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!selectedEventIds.length || bulkUpdating"
          @click="handleBulkUpdateWatchlistEvents({ isRead: true }, 'read')"
        >
          {{ bulkUpdating && pendingBulkAction === 'read' ? "正在更新..." : "批量标记已读" }}
        </button>
        <button
          class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!selectedEventIds.length || bulkUpdating"
          @click="handleBulkUpdateWatchlistEvents({ isRead: false }, 'unread')"
        >
          {{ bulkUpdating && pendingBulkAction === 'unread' ? "正在更新..." : "批量重新标记未读" }}
        </button>
        <button
          class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!selectedEventIds.length || bulkUpdating"
          @click="handleBulkUpdateWatchlistEvents({ isBookmarked: false }, 'unbookmark')"
        >
          {{ bulkUpdating && pendingBulkAction === 'unbookmark' ? "正在更新..." : "批量取消收藏" }}
        </button>
      </div>
    </section>

    <section
      v-if="filteredThemes.length"
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400/15 bg-slate-50/80 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]"
    >
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2.5 font-semibold">
          <input
            :checked="allVisibleThemesSelected"
            type="checkbox"
            @change="toggleSelectAllVisibleThemes(($event.target as HTMLInputElement).checked)"
          />
          选中当前筛选主题
        </label>
        <span class="text-[0.88rem] text-ink-secondary">已选 {{ selectedThemeIds.length }} 个主题</span>
      </div>
      <div class="flex flex-wrap gap-3">
        <button
          class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!selectedThemeIds.length || bulkThemeUpdating"
          @click="handleBulkUpdateWatchlistThemes({ isRead: true }, 'read')"
        >
          {{ bulkThemeUpdating && pendingThemeBulkAction === 'read' ? "正在更新..." : "选中主题全部标记已读" }}
        </button>
        <button
          class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!selectedThemeIds.length || bulkThemeUpdating"
          @click="handleBulkUpdateWatchlistThemes({ isRead: false }, 'unread')"
        >
          {{ bulkThemeUpdating && pendingThemeBulkAction === 'unread' ? "正在更新..." : "选中主题重新标记未读" }}
        </button>
        <button
          class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!selectedThemeIds.length || bulkThemeUpdating"
          @click="handleBulkUpdateWatchlistThemes({ isBookmarked: false }, 'unbookmark')"
        >
          {{ bulkThemeUpdating && pendingThemeBulkAction === 'unbookmark' ? "正在更新..." : "选中主题全部取消收藏" }}
        </button>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <RouterLink
        class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4 transition-colors hover:bg-white"
        :to="watchlistTarget({ stage: 'recent', completion: 'pending', unread: true })"
      >
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">最近待复盘</span>
        <span class="text-[1.2rem] font-bold text-ink-heading">{{ recentPendingThemeCount }}</span>
        <span class="text-[0.88rem] leading-[1.45] text-slate-500">最近新加入观察且仍有未读内容的主题</span>
      </RouterLink>
      <RouterLink
        class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4 transition-colors hover:bg-white"
        :to="watchlistTarget({ stage: 'recent', completion: 'pending', unread: true, useType: false })"
      >
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">最近待复盘事件</span>
        <span class="text-[1.2rem] font-bold text-ink-heading">{{ recentPendingEventCount }}</span>
        <span class="text-[0.88rem] leading-[1.45] text-slate-500">最近收藏且仍未完成首轮阅读的事件</span>
      </RouterLink>
      <RouterLink
        class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4 transition-colors hover:bg-white"
        :to="watchlistTarget({ stage: 'steady', completion: 'completed' })"
      >
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">持续跟踪主题</span>
        <span class="text-[1.2rem] font-bold text-ink-heading">{{ steadyCompletedThemeCount }}</span>
        <span class="text-[0.88rem] leading-[1.45] text-slate-500">已完成首轮复盘，适合低频回看的长期观察主题</span>
      </RouterLink>
      <RouterLink
        class="grid gap-1.5 rounded-2xl border border-slate-400/15 bg-white/75 p-4 transition-colors hover:bg-white"
        :to="watchlistTarget({ completion: 'all' })"
      >
        <span class="mb-1.5 block text-[0.84rem] uppercase tracking-[0.04em] text-[#736756]">全部观察对象</span>
        <span class="text-[1.2rem] font-bold text-ink-heading">{{ filteredThemes.length }}</span>
        <span class="text-[0.88rem] leading-[1.45] text-slate-500">回到当前筛选范围内的全部长期观察主题</span>
      </RouterLink>
    </section>

    <section v-if="dueForReviewThemes.length" class="card" :ref="setSectionRef('due-for-review')">
      <div class="card-topline">
        <h3>待复盘主题（按日期）</h3>
        <span class="text-[0.88rem] text-ink-secondary">按下次复盘日期排序，优先处理已到期的主题</span>
      </div>
      <div class="flex flex-col gap-3">
        <article v-for="theme in dueForReviewThemes" :key="`due-${theme.id}`" class="grid gap-2 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <span :class="pillToneClass()">{{ themeTypeLabel(theme.type) }}</span>
            <span v-if="theme.reviewStatus" :class="pillToneClass(theme.reviewStatus === 'tracking' ? '30d_low' : theme.reviewStatus === 'reviewed' ? 'active' : 'pending')">
              {{ theme.reviewStatus === 'pending_review' ? '待审核' : theme.reviewStatus === 'reviewed' ? '已审核' : '跟踪中' }}
            </span>
            <span v-if="theme.nextReviewDate" class="text-xs text-gray-500">下次复盘: {{ theme.nextReviewDate }}</span>
          </div>
          <strong>{{ theme.name }}</strong>
          <RouterLink class="text-sm font-semibold text-ink-link" :to="{ path: `/themes/${theme.id}`, query: { section: 'analysis' } }">
            查看主题 ›
          </RouterLink>
        </article>
      </div>
    </section>

    <HomeInboxDiagnosisCard
      title="观察摘要"
      priority-label="重点对象"
      :diagnostic="watchDiagnostic"
    />

    <HomeInboxDiagnosisCard
      v-if="reviewDiagnostic"
      title="待复盘"
      priority-label="优先复盘"
      :diagnostic="reviewDiagnostic"
    />

    <HomeInboxDiagnosisCard
      title="复盘节奏"
      priority-label="建议节奏"
      :diagnostic="reviewCadenceDiagnostic"
    />

    <HomeInboxDiagnosisCard
      title="复盘完成度"
      priority-label="完成情况"
      :diagnostic="completionDiagnostic"
    />

    <HomeInboxDiagnosisCard
      v-if="lowFrequencyDiagnostic"
      title="低频回看"
      priority-label="回看对象"
      :diagnostic="lowFrequencyDiagnostic"
    />

    <HomeInboxDiagnosisCard
      v-if="transitionDiagnostic"
      title="阶段迁移建议"
      priority-label="建议迁移"
      :diagnostic="transitionDiagnostic"
    />

    <article v-if="reviewThemes.length" class="card" :ref="setSectionRef('review-themes')">
      <div class="card-topline">
        <h3>待复盘主题</h3>
        <span class="text-[0.88rem] text-ink-secondary">优先处理仍有未读内容的长期观察主题</span>
      </div>
      <div class="flex flex-col gap-3">
        <article
          v-for="theme in reviewThemes"
          :key="theme.id"
          class="grid gap-2.5 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        >
          <label class="mb-3 flex items-center gap-2.5 text-[0.88rem] text-ink-secondary">
            <input
              :checked="selectedThemeIds.includes(theme.id)"
              type="checkbox"
              @change="toggleThemeSelection(theme.id)"
            />
            选中主题
          </label>
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span :class="pillToneClass()">{{ themeTypeLabel(theme.type) }}</span>
            <span :class="pillToneClass(themeImpactTone(theme))">{{ impactToneLabel(themeImpactTone(theme)) }}</span>
            <span :class="pillToneClass('neutral')">未读 {{ theme.unreadEventCount }}</span>
            <span :class="pillToneClass('30d_low')" v-if="theme.bookmarkedEventCount">收藏 {{ theme.bookmarkedEventCount }}</span>
          </div>
          <strong>{{ theme.name }}</strong>
          <div class="flex flex-wrap gap-x-2.5 gap-y-2">
            <span class="text-[0.88rem] text-ink-secondary">最近事件: {{ formatSmartDateTimeLabel(theme.latestEventAt) }}</span>
            <span class="text-[0.88rem] text-ink-secondary" v-if="theme.latestBookmarkedAt">最近收藏于 {{ formatSmartDateTimeLabel(theme.latestBookmarkedAt) }}</span>
          </div>
          <div class="text-ink-body">
            {{ theme.latestInsight ?? theme.latestEventTitle ?? "这个主题当前还没有摘要。" }}
          </div>
          <div class="mt-2 flex flex-wrap gap-3">
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: `/themes/${theme.id}`, query: { section: 'events' } }"
            >
              查看主题事件
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: '/events', query: { themeId: theme.id, bookmark: 'bookmarked', read: 'unread', sort: 'bookmarkedAt' } }"
            >
              只看本主题未读事件
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <button
              class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="savingThemeId === theme.id && pendingThemeAction === 'read'"
              @click.prevent="handleUpdateWatchlistThemeEvents(theme.id, { isRead: true }, 'read')"
            >
              {{ savingThemeId === theme.id && pendingThemeAction === 'read' ? "正在更新..." : "本主题全部标记已读" }}
            </button>
            <button
              class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
              @click.prevent="goToThemeEventStream(theme.id, 'all')"
            >
              打开本主题完整收藏流
            </button>
            <button
              class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="savingThemeId === theme.id && pendingThemeAction === 'unbookmark'"
              @click.prevent="handleUpdateWatchlistThemeEvents(theme.id, { isBookmarked: false }, 'unbookmark')"
            >
              {{ savingThemeId === theme.id && pendingThemeAction === 'unbookmark' ? "正在更新..." : "本主题取消收藏" }}
            </button>
          </div>
        </article>
      </div>
    </article>

    <article v-if="reviewEvents.length" class="card" :ref="setSectionRef('review-events')">
      <div class="card-topline">
        <h3>待复盘事件</h3>
        <span class="text-[0.88rem] text-ink-secondary">优先处理仍未读完的长期观察事件</span>
      </div>
      <div class="flex flex-col gap-3">
        <article
          v-for="event in reviewEvents"
          :key="event.id"
          class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        >
          <label class="mb-3 flex items-center gap-2.5 text-[0.88rem] text-ink-secondary">
            <input
              :checked="selectedEventIds.includes(event.id)"
              type="checkbox"
              @change="toggleEventSelection(event.id)"
            />
            选中事件
          </label>
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
            <span :class="pillToneClass(eventImpactTone(event))">{{ impactToneLabel(eventImpactTone(event)) }}</span>
            <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
            <span :class="pillToneClass(event.isRead ? 'active' : 'pending')">{{ eventReadLabel(event.isRead) }}</span>
          </div>
          <strong>{{ event.title }}</strong>
          <div class="flex flex-wrap gap-x-2.5 gap-y-2">
            <span class="text-[0.88rem] text-ink-secondary">主题: {{ event.themeName }}</span>
            <span class="text-[0.88rem] text-ink-secondary">收藏于: {{ formatSmartDateTimeLabel(event.bookmarkedAt) }}</span>
          </div>
          <div class="text-ink-body">{{ event.summary }}</div>
          <div class="mt-2 flex flex-wrap gap-3">
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="`/events/${event.id}`"
            >
              查看事件详情
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: `/themes/${event.themeId}`, query: { section: 'events' } }"
            >
              查看所属主题
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <button
              class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="savingEventId === event.id && pendingEventAction === 'read'"
              @click="handleUpdateWatchlistEvent(event.id, { isRead: true }, 'read')"
            >
              {{ savingEventId === event.id && pendingEventAction === 'read' ? "正在更新..." : "标记已读" }}
            </button>
            <button
              class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="savingEventId === event.id && pendingEventAction === 'unbookmark'"
              @click="handleUpdateWatchlistEvent(event.id, { isBookmarked: false }, 'unbookmark')"
            >
              {{ savingEventId === event.id && pendingEventAction === 'unbookmark' ? "正在更新..." : "取消收藏" }}
            </button>
          </div>
        </article>
      </div>
    </article>

    <article v-if="completedThemes.length" class="card" :ref="setSectionRef('completed-themes')">
      <div class="card-topline">
        <h3>低频回看主题</h3>
        <span class="text-[0.88rem] text-ink-secondary">这些主题已经完成首轮复盘，适合按周或按阶段性变化再回看</span>
      </div>
      <div class="flex flex-col gap-3">
        <article
          v-for="theme in completedThemes"
          :key="`completed-${theme.id}`"
          class="grid gap-2.5 rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        >
          <label class="mb-3 flex items-center gap-2.5 text-[0.88rem] text-ink-secondary">
            <input
              :checked="selectedThemeIds.includes(theme.id)"
              type="checkbox"
              @change="toggleThemeSelection(theme.id)"
            />
            选中主题
          </label>
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span :class="pillToneClass()">{{ themeTypeLabel(theme.type) }}</span>
            <span :class="pillToneClass(themeImpactTone(theme))">{{ impactToneLabel(themeImpactTone(theme)) }}</span>
            <span :class="pillToneClass('30d_low')" v-if="theme.bookmarkedEventCount">收藏 {{ theme.bookmarkedEventCount }}</span>
          </div>
          <strong>{{ theme.name }}</strong>
          <div class="flex flex-wrap gap-x-2.5 gap-y-2">
            <span class="text-[0.88rem] text-ink-secondary">最近收藏于 {{ formatSmartDateTimeLabel(theme.latestBookmarkedAt) }}</span>
            <span class="text-[0.88rem] text-ink-secondary">最近事件: {{ formatSmartDateTimeLabel(theme.latestEventAt) }}</span>
          </div>
          <div class="text-ink-body">
            {{ theme.latestInsight ?? theme.latestEventTitle ?? "这个主题当前还没有摘要。" }}
          </div>
          <div class="mt-2 flex flex-wrap gap-3">
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: `/themes/${theme.id}`, query: { section: 'timeline' } }"
            >
              查看主题时间线
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: '/events', query: { themeId: theme.id, bookmark: 'bookmarked', sort: 'bookmarkedAt' } }"
            >
              查看本主题收藏事件
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <button
              class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover"
              @click.prevent="goToThemeEventStream(theme.id, 'read')"
            >
              只看本主题已读事件
            </button>
            <button
              class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="savingThemeId === theme.id && pendingThemeAction === 'unread'"
              @click.prevent="handleUpdateWatchlistThemeEvents(theme.id, { isRead: false }, 'unread')"
            >
              {{ savingThemeId === theme.id && pendingThemeAction === 'unread' ? "正在更新..." : "本主题重新标记未读" }}
            </button>
            <button
              class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="savingThemeId === theme.id && pendingThemeAction === 'unbookmark'"
              @click.prevent="handleUpdateWatchlistThemeEvents(theme.id, { isBookmarked: false }, 'unbookmark')"
            >
              {{ savingThemeId === theme.id && pendingThemeAction === 'unbookmark' ? "正在更新..." : "本主题取消收藏" }}
            </button>
          </div>
        </article>
      </div>
    </article>

    <article v-if="completedEvents.length" class="card" :ref="setSectionRef('completed-events')">
      <div class="card-topline">
        <h3>低频回看事件</h3>
        <span class="text-[0.88rem] text-ink-secondary">这些收藏事件已经完成首轮阅读，适合后续按节奏复盘</span>
      </div>
      <div class="flex flex-col gap-3">
        <article
          v-for="event in completedEvents"
          :key="`completed-event-${event.id}`"
          class="rounded-2xl border border-slate-400/15 bg-slate-50/90 px-4 py-3.5"
        >
          <label class="mb-3 flex items-center gap-2.5 text-[0.88rem] text-ink-secondary">
            <input
              :checked="selectedEventIds.includes(event.id)"
              type="checkbox"
              @change="toggleEventSelection(event.id)"
            />
            选中事件
          </label>
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span :class="pillToneClass(event.signal)">{{ eventSignalLabel(event.signal) }}</span>
            <span :class="pillToneClass(eventImpactTone(event))">{{ impactToneLabel(eventImpactTone(event)) }}</span>
            <span :class="pillToneClass(event.status)">{{ eventStatusLabel(event.status) }}</span>
            <span :class="pillToneClass('active')">{{ eventReadLabel(true) }}</span>
          </div>
          <strong>{{ event.title }}</strong>
          <div class="flex flex-wrap gap-x-2.5 gap-y-2">
            <span class="text-[0.88rem] text-ink-secondary">主题: {{ event.themeName }}</span>
            <span class="text-[0.88rem] text-ink-secondary">收藏于: {{ formatSmartDateTimeLabel(event.bookmarkedAt) }}</span>
          </div>
          <div class="text-ink-body">{{ event.summary }}</div>
          <div class="mt-2 flex flex-wrap gap-3">
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="`/events/${event.id}`"
            >
              查看事件详情
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <RouterLink
              class="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-ink-link"
              :to="{ path: `/themes/${event.themeId}`, query: { section: 'timeline' } }"
            >
              查看所属主题时间线
              <span aria-hidden="true" class="text-base leading-none">›</span>
            </RouterLink>
            <button
              class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="savingEventId === event.id && pendingEventAction === 'unread'"
              @click="handleUpdateWatchlistEvent(event.id, { isRead: false }, 'unread')"
            >
              {{ savingEventId === event.id && pendingEventAction === 'unread' ? "正在更新..." : "重新标记未读" }}
            </button>
            <button
              class="inline-flex items-center justify-center rounded-xl bg-btn-primary px-4 py-2.5 text-ink-emphasis transition-colors hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="savingEventId === event.id && pendingEventAction === 'unbookmark'"
              @click="handleUpdateWatchlistEvent(event.id, { isBookmarked: false }, 'unbookmark')"
            >
              {{ savingEventId === event.id && pendingEventAction === 'unbookmark' ? "正在更新..." : "取消收藏" }}
            </button>
          </div>
        </article>
      </div>
    </article>

    <div :ref="setSectionRef('watch-themes')">
      <ThemeReviewCard :themes="filteredThemes" />
    </div>
    <div :ref="setSectionRef('watch-events')">
      <HomeInboxBookmarkedEventsCard :events="filteredEvents" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, type ComponentPublicInstance, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import HomeInboxBookmarkedEventsCard from "../inbox/components/HomeInboxBookmarkedEventsCard.vue";
import HomeInboxDiagnosisCard from "../inbox/components/HomeInboxDiagnosisCard.vue";
import { buildLongTermWatch } from "../inbox/components/home-inbox-model";
import ThemeReviewCard from "../themes/components/ThemeReviewCard.vue";
import { eventImpactTone, impactToneLabel, themeImpactTone } from "../../lib/impact";
import { sameQuery } from "../../lib/query";
import { toTimestamp } from "../../lib/time";
import { fetchDashboard, type EventSummary, type ThemeSummary, updateEvent } from "../../lib/api";
import {
  eventReadLabel,
  eventSignalLabel,
  eventStatusLabel,
  formatSmartDateTimeLabel,
  pillToneClass,
  themeTypeLabel,
} from "../../lib/presentation";

const bookmarkedThemes = ref<ThemeSummary[]>([]);
const bookmarkedEvents = ref<EventSummary[]>([]);
const query = ref("");
const sectionRefs = ref<Record<string, HTMLElement | null>>({});
const savingEventId = ref("");
const pendingEventAction = ref("");
const savingThemeId = ref("");
const pendingThemeAction = ref("");
const selectedEventIds = ref<string[]>([]);
const selectedThemeIds = ref<string[]>([]);
const bulkUpdating = ref(false);
const pendingBulkAction = ref("");
const bulkThemeUpdating = ref(false);
const pendingThemeBulkAction = ref("");
const operationNotice = ref<{
  message: string;
  actions: Array<{ label: string; to: { path: string; query?: Record<string, string | undefined> } }>;
} | null>(null);
const selectedPhasePresetId = ref("");
const stageFilter = ref<"all" | "recent" | "steady">("all");
const typeFilter = ref<"all" | "price" | "content_update" | "news_announcement" | "financial_event">("all");
const impactFilter = ref<"all" | "positive" | "negative" | "neutral">("all");
const completionFilter = ref<"all" | "pending" | "completed">("all");
const reviewStatusFilter = ref<"all" | "pending_review" | "reviewed" | "tracking" | "none">("all");
const unreadOnly = ref(false);
const recentThreshold = 7 * 24 * 60 * 60 * 1000;
const route = useRoute();
const router = useRouter();
const watchlistManagedQueryKeys = ["q", "query", "stage", "type", "impact", "completion", "unread"] as const;
type WatchlistQueryOverrides = {
  stage?: "all" | "recent" | "steady";
  impact?: "all" | "positive" | "negative" | "neutral";
  completion?: "all" | "pending" | "completed";
  unread?: boolean;
  useType?: boolean;
  useQuery?: boolean;
};
const phasePresets = [
  { id: "recent-pending", label: "最近待复盘", filters: { stage: "recent", completion: "pending", unread: true } },
  { id: "steady-completed", label: "持续跟踪中", filters: { stage: "steady", completion: "completed", unread: false } },
  { id: "all-pending", label: "全部待复盘", filters: { stage: "all", completion: "pending", unread: true } },
  { id: "all-completed", label: "全部已完成", filters: { stage: "all", completion: "completed", unread: false } },
] as const;

function setSectionRef(sectionId: string) {
  return (element: Element | ComponentPublicInstance | null) => {
    sectionRefs.value[sectionId] = element instanceof HTMLElement ? element : null;
  };
}

function scrollToSection(sectionId: string) {
  const node = sectionRefs.value[sectionId];

  if (!node) {
    return;
  }

  node.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyPhasePreset(
  preset: (typeof phasePresets)[number],
) {
  stageFilter.value = preset.filters.stage;
  completionFilter.value = preset.filters.completion;
  unreadOnly.value = preset.filters.unread;
  selectedPhasePresetId.value = preset.id;
}

function isActivePhasePreset(
  preset: (typeof phasePresets)[number],
) {
  return (
    stageFilter.value === preset.filters.stage &&
    completionFilter.value === preset.filters.completion &&
    unreadOnly.value === preset.filters.unread
  );
}

const activePhasePresetId = computed(() => {
  if (!selectedPhasePresetId.value) {
    return "";
  }

  const preset = phasePresets.find((item) => item.id === selectedPhasePresetId.value);
  if (!preset) {
    return "";
  }

  return isActivePhasePreset(preset) ? selectedPhasePresetId.value : "";
});

const filterSummary = computed(() => {
  const parts = [
    query.value ? `搜索“${query.value}”` : "",
    stageFilter.value === "recent" ? "最近新加入观察" : "",
    stageFilter.value === "steady" ? "持续跟踪中" : "",
    typeFilter.value === "price" ? "价格" : "",
    typeFilter.value === "content_update" ? "内容更新" : "",
    typeFilter.value === "news_announcement" ? "公告" : "",
    typeFilter.value === "financial_event" ? "金融事件" : "",
    impactFilter.value === "positive" ? "偏利好" : "",
    impactFilter.value === "negative" ? "偏利空" : "",
    impactFilter.value === "neutral" ? "中性" : "",
    completionFilter.value === "pending" ? "仍待复盘" : "",
    completionFilter.value === "completed" ? "已完成首轮复盘" : "",
    unreadOnly.value ? "只看仍有未读内容" : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "全部阶段 · 全部类型";
});

const recentPendingThemeCount = computed(() => {
  const threshold = Date.now() - recentThreshold;
  return bookmarkedThemes.value.filter((theme) => toTimestamp(theme.latestBookmarkedAt) >= threshold && (theme.unreadEventCount ?? 0) > 0).length;
});

const recentPendingEventCount = computed(() => {
  const threshold = Date.now() - recentThreshold;
  return bookmarkedEvents.value.filter((event) => toTimestamp(event.bookmarkedAt) >= threshold && !event.isRead).length;
});

const steadyCompletedThemeCount = computed(() => {
  const threshold = Date.now() - recentThreshold;
  return bookmarkedThemes.value.filter((theme) => {
    const bookmarkedAt = toTimestamp(theme.latestBookmarkedAt);
    return bookmarkedAt > 0 && bookmarkedAt < threshold && (theme.unreadEventCount ?? 0) === 0;
  }).length;
});
const watchlistSections = computed(() =>
  [
    dueForReviewThemes.value.length ? { id: "due-for-review", label: "待复盘主题（按日期）" } : null,
    reviewThemes.value.length ? { id: "review-themes", label: "待复盘主题" } : null,
    reviewEvents.value.length ? { id: "review-events", label: "待复盘事件" } : null,
    completedThemes.value.length ? { id: "completed-themes", label: "低频回看主题" } : null,
    completedEvents.value.length ? { id: "completed-events", label: "低频回看事件" } : null,
    filteredThemes.value.length ? { id: "watch-themes", label: "长期观察主题" } : null,
    filteredEvents.value.length ? { id: "watch-events", label: "重点收藏事件" } : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>,
);
const stageSummary = computed(() => {
  const stageLabel =
      stageFilter.value === "recent"
        ? "最近新加入观察"
        : stageFilter.value === "steady"
          ? "持续跟踪中"
          : "全部阶段";
  const typeLabel =
    typeFilter.value === "price"
      ? "价格"
      : typeFilter.value === "content_update"
        ? "内容更新"
        : typeFilter.value === "news_announcement"
        ? "公告"
        : typeFilter.value === "financial_event"
          ? "金融事件"
          : "全部类型";
  const impactLabel =
    impactFilter.value === "positive"
      ? "偏利好"
      : impactFilter.value === "negative"
        ? "偏利空"
        : impactFilter.value === "neutral"
          ? "中性"
          : "全部影响";
  const completionLabel =
    completionFilter.value === "pending"
      ? "仍待复盘"
      : completionFilter.value === "completed"
        ? "已完成首轮复盘"
        : "全部完成度";

  if (unreadOnly.value) {
    return `当前正在查看 ${stageLabel}、${completionLabel}、${impactLabel} 的 ${typeLabel} 收藏对象中仍有未读内容的部分，适合优先完成一轮阶段性复盘。`;
  }

  return `当前正在查看 ${stageLabel}、${completionLabel}、${impactLabel} 的 ${typeLabel} 收藏对象，适合按收藏时间和主题重要性安排后续回看。`;
});

const filteredThemes = computed(() => {
  const threshold = Date.now() - recentThreshold;

  return bookmarkedThemes.value.filter((theme) => {
    const bookmarkedAt = toTimestamp(theme.latestBookmarkedAt);
    const matchesStage =
      ( !query.value ||
        theme.name.toLowerCase().includes(query.value.toLowerCase()) ||
        String(theme.latestInsight ?? theme.latestEventTitle ?? "").toLowerCase().includes(query.value.toLowerCase())
      ) &&
      (
      stageFilter.value === "all" ||
      (stageFilter.value === "recent" && bookmarkedAt >= threshold) ||
      (stageFilter.value === "steady" && bookmarkedAt > 0 && bookmarkedAt < threshold));
    const matchesType = typeFilter.value === "all" || theme.type === typeFilter.value;
    const matchesImpact = impactFilter.value === "all" || themeImpactTone(theme) === impactFilter.value;
    const matchesCompletion =
      completionFilter.value === "all" ||
      (completionFilter.value === "pending" && (theme.unreadEventCount ?? 0) > 0) ||
      (completionFilter.value === "completed" && (theme.unreadEventCount ?? 0) === 0);
    const matchesUnread = !unreadOnly.value || (theme.unreadEventCount ?? 0) > 0;
    const matchesReviewStatus = reviewStatusFilter.value === "all" ||
      (reviewStatusFilter.value === "none" && !theme.reviewStatus) ||
      theme.reviewStatus === reviewStatusFilter.value;

    return matchesStage && matchesType && matchesImpact && matchesCompletion && matchesUnread && matchesReviewStatus;
  });
});

const filteredEvents = computed(() => {
  const threshold = Date.now() - recentThreshold;

  return bookmarkedEvents.value.filter((event) => {
    const bookmarkedAt = toTimestamp(event.bookmarkedAt);
    const matchesStage =
      (!query.value ||
        event.title.toLowerCase().includes(query.value.toLowerCase()) ||
        event.themeName.toLowerCase().includes(query.value.toLowerCase()) ||
        event.summary.toLowerCase().includes(query.value.toLowerCase())) &&
      (
      stageFilter.value === "all" ||
      (stageFilter.value === "recent" && bookmarkedAt >= threshold) ||
      (stageFilter.value === "steady" && bookmarkedAt > 0 && bookmarkedAt < threshold));
    const matchesType = typeFilter.value === "all" || event.infoType === typeFilter.value;
    const matchesImpact = impactFilter.value === "all" || eventImpactTone(event) === impactFilter.value;
    const matchesCompletion =
      completionFilter.value === "all" ||
      (completionFilter.value === "pending" && !event.isRead) ||
      (completionFilter.value === "completed" && Boolean(event.isRead));
    const matchesUnread = !unreadOnly.value || !event.isRead;

    return matchesStage && matchesType && matchesImpact && matchesCompletion && matchesUnread;
  });
});

const allVisibleSelected = computed(() => {
  if (!filteredEvents.value.length) {
    return false;
  }

  return filteredEvents.value.every((event) => selectedEventIds.value.includes(event.id));
});

const allVisibleThemesSelected = computed(() => {
  if (!filteredThemes.value.length) {
    return false;
  }

  return filteredThemes.value.every((theme) => selectedThemeIds.value.includes(theme.id));
});

const reviewThemes = computed(() =>
  filteredThemes.value.filter((theme) => (theme.unreadEventCount ?? 0) > 0),
);

const reviewEvents = computed(() =>
  filteredEvents.value.filter((event) => !event.isRead),
);

const completedThemes = computed(() =>
  filteredThemes.value.filter((theme) => (theme.unreadEventCount ?? 0) === 0),
);

const completedEvents = computed(() =>
  filteredEvents.value.filter((event) => Boolean(event.isRead)),
);

const dueForReviewThemes = computed(() => {
  return bookmarkedThemes.value
    .filter((theme) => theme.nextReviewDate)
    .sort((a, b) => (a.nextReviewDate ?? "").localeCompare(b.nextReviewDate ?? ""));
});

const watchDiagnostic = computed(() =>
  buildLongTermWatch(filteredThemes.value, filteredEvents.value, (theme) => ({
    path: `/themes/${theme.id}`,
    query: { section: "events" },
  })),
);

function watchlistTarget(overrides: WatchlistQueryOverrides = {}) {
  const nextStage = overrides.stage ?? stageFilter.value;
  const nextImpact = overrides.impact ?? impactFilter.value;
  const nextCompletion = overrides.completion ?? completionFilter.value;
  const nextUnread = overrides.unread ?? unreadOnly.value;
  const nextUseType = overrides.useType ?? true;
  const nextUseQuery = overrides.useQuery ?? true;

  return {
    path: "/watchlist",
    query: {
      q: nextUseQuery && query.value.trim() ? query.value.trim() : undefined,
      stage: nextStage === "all" ? undefined : nextStage,
      type: nextUseType && typeFilter.value !== "all" ? typeFilter.value : undefined,
      impact: nextImpact === "all" ? undefined : nextImpact,
      completion: nextCompletion === "all" ? undefined : nextCompletion,
      unread: nextUnread ? "true" : undefined,
    },
  };
}

function setOperationNotice(
  message: string,
  actions: Array<{ label: string; to: { path: string; query?: Record<string, string | undefined> } }>,
) {
  operationNotice.value = { message, actions };
}

function buildWatchlistOperationNotice(
  action: "read" | "unread" | "unbookmark",
  scope: "event" | "bulk-event" | "theme" | "bulk-theme",
  themeId?: string,
) {
  if (scope === "theme" || scope === "bulk-theme") {
    if (action === "read") {
      return {
        message: scope === "theme" ? "本主题下的当前观察事件已全部标记为已读。" : "选中主题下的当前观察事件已全部标记为已读。",
        actions: [
          { label: "查看已完成首轮复盘", to: watchlistTarget({ completion: "completed", unread: false, useType: false }) },
          themeId
            ? { label: "查看该主题时间线", to: { path: `/themes/${themeId}`, query: { section: "timeline" } } }
            : { label: "查看已读收藏事件", to: { path: "/events", query: { q: query.value.trim() || undefined, bookmark: "bookmarked", read: "read", sort: "bookmarkedAt", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
          themeId
            ? { label: "查看该主题已读事件", to: { path: "/events", query: { q: query.value.trim() || undefined, themeId, bookmark: "bookmarked", read: "read", sort: "bookmarkedAt" } } }
            : { label: "查看全部已读收藏事件", to: { path: "/events", query: { q: query.value.trim() || undefined, bookmark: "bookmarked", read: "read", sort: "bookmarkedAt", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
        ],
      };
    }

    if (action === "unread") {
      return {
        message: scope === "theme" ? "本主题下的当前观察事件已重新标记为未读。" : "选中主题下的当前观察事件已重新标记为未读。",
        actions: [
          { label: "继续处理待复盘主题", to: watchlistTarget({ completion: "pending", unread: true, useType: false }) },
          themeId
            ? { label: "查看该主题事件", to: { path: `/themes/${themeId}`, query: { section: "events" } } }
            : { label: "查看未读收藏事件", to: { path: "/events", query: { q: query.value.trim() || undefined, bookmark: "bookmarked", read: "unread", sort: "bookmarkedAt", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
        ],
      };
    }

    return {
      message: scope === "theme" ? "本主题下的当前观察事件已全部取消收藏。" : "选中主题下的当前观察事件已全部取消收藏。",
      actions: [
        { label: "回到观察清单", to: watchlistTarget({ completion: "all", unread: false, useType: false }) },
        { label: "查看全部收藏主题", to: { path: "/themes", query: { queue: "bookmarked", sort: "latestBookmarked" } } },
      ],
    };
  }

  if (action === "read") {
    return {
      message: scope === "event" ? "事件已标记为已读。" : "已批量标记为已读。",
      actions: [
        { label: "查看待复盘对象", to: watchlistTarget({ completion: "pending", unread: true, useType: false }) },
        { label: "查看已读收藏事件", to: { path: "/events", query: { q: query.value.trim() || undefined, bookmark: "bookmarked", read: "read", sort: "bookmarkedAt", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
      ],
    };
  }

  if (action === "unread") {
    return {
      message: scope === "event" ? "事件已重新标记为未读。" : "已批量重新标记为未读。",
      actions: [
        { label: "继续处理待复盘事件", to: watchlistTarget({ completion: "pending", unread: true, useType: false }) },
        { label: "查看未读收藏事件", to: { path: "/events", query: { q: query.value.trim() || undefined, bookmark: "bookmarked", read: "unread", sort: "bookmarkedAt", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
      ],
    };
  }

  return {
    message: scope === "event" ? "事件已取消收藏。" : "已批量取消收藏。",
    actions: [
      { label: "回到观察清单", to: watchlistTarget({ completion: "all", unread: false, useType: false }) },
      { label: "查看全部收藏事件", to: { path: "/events", query: { q: query.value.trim() || undefined, bookmark: "bookmarked", sort: "bookmarkedAt", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
    ],
  };
}

const reviewDiagnostic = computed(() => {
  if (!reviewThemes.value.length && !reviewEvents.value.length) {
    return null;
  }

  const topTheme = reviewThemes.value[0];
  const topEvent = reviewEvents.value[0];

  return {
    tone: "pending",
    toneLabel: "仍有待复盘",
    headline: "当前观察清单里仍有未读内容，适合先完成一轮针对长期观察对象的复盘。",
    summary: `当前有 ${reviewThemes.value.length} 个收藏主题、${reviewEvents.value.length} 条收藏事件仍有未读内容。`,
    priorityItems: [
      topTheme
        ? `${topTheme.name} 当前仍有 ${topTheme.unreadEventCount ?? 0} 条未读事件，适合作为优先复盘主题。`
        : "当前没有明显需要优先复盘的收藏主题。",
      topEvent
        ? `最新待复盘事件是「${topEvent.title}」，建议先读完并决定是否继续长期跟踪。`
        : "当前没有单条待复盘事件需要优先打开。",
      reviewThemes.value.length > 1
        ? `除最高优先级主题外，仍有 ${reviewThemes.value.length - 1} 个主题值得继续复盘。`
        : "当前待复盘对象数量不多，适合逐个处理。",
    ],
    actions: [
      { label: "只看仍有未读内容", to: { path: "/watchlist", query: { stage: stageFilter.value === "all" ? undefined : stageFilter.value, type: typeFilter.value === "all" ? undefined : typeFilter.value, unread: "true" } } },
      { label: "查看未读收藏事件", to: { path: "/events", query: { q: query.value.trim() || undefined, bookmark: "bookmarked", read: "unread", sort: "bookmarkedAt", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
      topTheme
        ? { label: `打开 ${topTheme.name}`, to: { path: `/themes/${topTheme.id}`, query: { section: "events" } } }
        : { label: "打开观察清单", to: { path: "/watchlist" } },
    ],
  };
});

const reviewCadenceDiagnostic = computed(() => {
  const stageLabel =
    stageFilter.value === "recent"
      ? "最近新加入观察"
      : stageFilter.value === "steady"
        ? "持续跟踪中"
        : "全部阶段";
  const typeLabel =
    typeFilter.value === "price"
      ? "价格"
      : typeFilter.value === "news_announcement"
        ? "公告"
        : typeFilter.value === "financial_event"
          ? "金融事件"
          : "全部类型";

  return {
    tone: reviewEvents.value.length > 0 ? "pending" : "healthy",
    toneLabel: reviewEvents.value.length > 0 ? "需要安排节奏" : "节奏平稳",
    headline:
      reviewEvents.value.length > 0
        ? `当前 ${stageLabel} 的 ${typeLabel} 收藏对象里仍有待复盘内容，适合按批次推进。`
        : `当前 ${stageLabel} 的 ${typeLabel} 收藏对象大多已经完成首轮复盘。`,
    summary:
      reviewEvents.value.length > 0
        ? `建议先清完最近需要复盘的 ${reviewEvents.value.length} 条事件，再进入长期回看。`
        : "当前更适合做轻量回看和持续跟踪，而不是集中清理待办。",
    priorityItems: reviewEvents.value.length > 0
      ? [
          "先处理最近新加入观察且仍未读的事件，避免长期观察清单继续膨胀。",
          "同一主题下如果连续出现多条未读收藏事件，优先进入主题事件区整体复盘。",
          "处理完未读事件后，再回到持续跟踪中的对象做阶段性复盘。",
        ]
      : [
          "当前可以按收藏时间顺序做轻量回看，不需要集中清理待办。",
          "如果新的高价值线索持续增加，再切回最近新加入观察视图集中处理。",
        ],
    actions: reviewEvents.value.length > 0
      ? [
          { label: "只看最近新加入观察", to: { path: "/watchlist", query: { stage: "recent", type: typeFilter.value === "all" ? undefined : typeFilter.value, unread: unreadOnly.value ? "true" : undefined } } },
          { label: "只看持续跟踪中", to: { path: "/watchlist", query: { stage: "steady", type: typeFilter.value === "all" ? undefined : typeFilter.value, unread: unreadOnly.value ? "true" : undefined } } },
          { label: "查看全部未读收藏事件", to: { path: "/events", query: { q: query.value.trim() || undefined, bookmark: "bookmarked", read: "unread", sort: "bookmarkedAt", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
        ]
      : [
          { label: "查看全部收藏事件", to: { path: "/events", query: { q: query.value.trim() || undefined, bookmark: "bookmarked", sort: "bookmarkedAt", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
          { label: "查看收藏主题", to: { path: "/themes", query: { queue: "bookmarked", sort: "latestBookmarked" } } },
        ],
  };
});

const lowFrequencyDiagnostic = computed(() => {
  if (!completedThemes.value.length && !completedEvents.value.length) {
    return null;
  }

  const topTheme = completedThemes.value[0];
  const topEvent = completedEvents.value[0];

  return {
    tone: "healthy",
    toneLabel: "适合低频回看",
    headline: "这批对象已经完成首轮复盘，更适合按周或按阶段性变化做低频回看，而不是每天重复处理。",
    summary: `当前有 ${completedThemes.value.length} 个主题、${completedEvents.value.length} 条收藏事件已经完成首轮复盘。`,
    priorityItems: [
      topTheme
        ? `${topTheme.name} 已经完成首轮复盘，后续更适合沿着时间线定期回看。`
        : "当前没有已完成首轮复盘的主题。",
      topEvent
        ? `事件「${topEvent.title}」已完成首轮阅读，适合在后续关键变化发生时再回看。`
        : "当前没有已完成首轮复盘的收藏事件。",
      completedThemes.value.length > 1
        ? `除最高优先级对象外，仍有 ${completedThemes.value.length - 1} 个主题可以进入低频跟踪节奏。`
        : "当前低频回看对象数量不多，适合逐个精细跟踪。",
    ],
    actions: [
      { label: "只看持续跟踪中", to: { path: "/watchlist", query: { stage: "steady", type: typeFilter.value === "all" ? undefined : typeFilter.value, unread: undefined } } },
      { label: "查看已读收藏事件", to: { path: "/events", query: { q: query.value.trim() || undefined, bookmark: "bookmarked", read: "read", sort: "bookmarkedAt", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
      topTheme
        ? { label: `查看 ${topTheme.name} 时间线`, to: { path: `/themes/${topTheme.id}`, query: { section: "timeline" } } }
        : { label: "查看收藏主题", to: { path: "/themes", query: { queue: "bookmarked", sort: "latestBookmarked" } } },
    ],
  };
});

const transitionDiagnostic = computed(() => {
  if (!reviewThemes.value.length && !completedThemes.value.length) {
    return null;
  }

  return {
    tone: reviewThemes.value.length > 0 && completedThemes.value.length > 0 ? "pending" : "healthy",
    toneLabel: reviewThemes.value.length > 0 ? "可推进迁移" : "阶段稳定",
    headline:
      reviewThemes.value.length > 0 && completedThemes.value.length > 0
        ? "当前既有待复盘对象，也有已完成首轮复盘对象，适合分批把它们推向下一阶段。"
        : reviewThemes.value.length > 0
          ? "当前主要还是把对象从待复盘推进到已完成首轮复盘。"
          : "当前大多数对象已经进入低频回看阶段。",
    summary: `当前有 ${reviewThemes.value.length} 个待复盘主题、${completedThemes.value.length} 个已完成首轮复盘主题。`,
    priorityItems:
      reviewThemes.value.length > 0
        ? [
            "待复盘主题处理完成后，应尽快切换到已完成首轮复盘视角确认沉淀结果。",
            "已完成首轮复盘的主题更适合转入低频回看和时间线复盘。",
            "如果某个低频回看主题再次出现新未读事件，应重新拉回待复盘阶段。",
          ]
        : [
            "当前主要工作是按周或按阶段变化继续回看已完成首轮复盘的对象。",
            "如有新的高价值收藏对象进入，可再切回最近新加入观察阶段。",
          ],
    actions: [
      { label: "查看待复盘主题", to: watchlistTarget({ completion: "pending", unread: true, useType: false }) },
      { label: "查看已完成首轮复盘", to: watchlistTarget({ completion: "completed", unread: false, useType: false }) },
      { label: "查看持续跟踪中", to: watchlistTarget({ stage: "steady", completion: "completed", unread: false }) },
    ],
  };
});

const completionDiagnostic = computed(() => {
  const completedThemes = filteredThemes.value.filter((theme) => (theme.unreadEventCount ?? 0) === 0);
  const completedEvents = filteredEvents.value.filter((event) => event.isRead);
  const pendingThemes = filteredThemes.value.filter((theme) => (theme.unreadEventCount ?? 0) > 0);

  return {
    tone: pendingThemes.length > 0 ? "pending" : "healthy",
    toneLabel: pendingThemes.length > 0 ? "仍有未完成项" : "首轮已完成",
    headline:
      pendingThemes.length > 0
        ? "当前仍有一部分长期观察对象没有完成首轮复盘，适合继续按节奏推进。"
        : "当前筛选范围内的长期观察对象大多已经完成首轮复盘，可以进入更轻量的持续跟踪节奏。",
    summary:
      pendingThemes.length > 0
        ? `当前有 ${completedThemes.length} 个主题已完成首轮复盘，${pendingThemes.length} 个主题仍有未读内容；对应事件里有 ${completedEvents.length} 条已读收藏事件。`
        : `当前有 ${completedThemes.length} 个主题、${completedEvents.length} 条收藏事件已经完成首轮复盘。`,
    priorityItems: pendingThemes.length > 0
      ? [
          `已完成首轮复盘的主题有 ${completedThemes.length} 个，可以转入低频回看。`,
          `仍待处理的主题有 ${pendingThemes.length} 个，建议继续按最近收藏时间推进。`,
          `已读收藏事件累计 ${completedEvents.length} 条，可作为后续趋势与时间线复盘素材。`,
        ]
      : [
          "当前收藏主题大多已经完成初步阅读，可以按周或按阶段性变化继续回看。",
          `已读收藏事件累计 ${completedEvents.length} 条，适合沉淀为长期观察样本。`,
        ],
    actions: pendingThemes.length > 0
      ? [
          { label: "继续处理待复盘主题", to: { path: "/watchlist", query: { stage: stageFilter.value === "all" ? undefined : stageFilter.value, type: typeFilter.value === "all" ? undefined : typeFilter.value, unread: "true" } } },
          { label: "查看已读收藏事件", to: { path: "/events", query: { bookmark: "bookmarked", read: "read", sort: "bookmarkedAt" } } },
        ]
      : [
          { label: "查看全部收藏主题", to: { path: "/themes", query: { queue: "bookmarked", sort: "latestBookmarked" } } },
          { label: "查看全部收藏事件", to: { path: "/events", query: { bookmark: "bookmarked", sort: "bookmarkedAt" } } },
        ],
  };
});

function buildManagedQuery() {
  const nextQuery: Record<string, string> = {};

  if (query.value.trim()) {
    nextQuery.q = query.value.trim();
  }

  if (stageFilter.value !== "all") {
    nextQuery.stage = stageFilter.value;
  }

  if (typeFilter.value !== "all") {
    nextQuery.type = typeFilter.value;
  }

  if (impactFilter.value !== "all") {
    nextQuery.impact = impactFilter.value;
  }

  if (completionFilter.value !== "all") {
    nextQuery.completion = completionFilter.value;
  }

  if (unreadOnly.value) {
    nextQuery.unread = "true";
  }

  return nextQuery;
}

function readRouteFilters() {
  const queryStage = route.query.stage;
  const queryText = route.query.q ?? route.query.query;
  const queryType = route.query.type;
  const queryImpact = route.query.impact;
  const queryCompletion = route.query.completion;
  const queryUnread = route.query.unread;
  const allowedStages = ["all", "recent", "steady"];
  const allowedTypes = ["all", "price", "content_update", "news_announcement", "financial_event"];
  const allowedImpact = ["all", "positive", "negative", "neutral"];
  const allowedCompletion = ["all", "pending", "completed"];

  query.value = typeof queryText === "string" ? queryText : "";
  stageFilter.value =
    typeof queryStage === "string" && allowedStages.includes(queryStage)
      ? (queryStage as "all" | "recent" | "steady")
      : "all";
  typeFilter.value =
    typeof queryType === "string" && allowedTypes.includes(queryType)
      ? (queryType as "all" | "price" | "content_update" | "news_announcement" | "financial_event")
      : "all";
  impactFilter.value =
    typeof queryImpact === "string" && allowedImpact.includes(queryImpact)
      ? (queryImpact as "all" | "positive" | "negative" | "neutral")
      : "all";
  completionFilter.value =
    typeof queryCompletion === "string" && allowedCompletion.includes(queryCompletion)
      ? (queryCompletion as "all" | "pending" | "completed")
      : "all";
  unreadOnly.value = queryUnread === "true" || queryUnread === "1";
}

function syncRouteQueryFromFilters() {
  const nextManagedQuery = buildManagedQuery();
  const currentManagedQuery = Object.fromEntries(
    Object.entries(route.query)
      .filter(([key]) => watchlistManagedQueryKeys.includes(key as never))
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;

  if (sameQuery(nextManagedQuery, currentManagedQuery)) {
    return;
  }

  const preservedEntries = Object.entries(route.query).filter(([key]) => !watchlistManagedQueryKeys.includes(key as never));
  const preservedQuery = Object.fromEntries(preservedEntries);

  void router.replace({
    query: {
      ...preservedQuery,
      ...nextManagedQuery,
    },
  });
}

function resetFilters() {
  query.value = "";
  stageFilter.value = "all";
  typeFilter.value = "all";
  impactFilter.value = "all";
  completionFilter.value = "all";
  unreadOnly.value = false;
  selectedPhasePresetId.value = "";
}

onMounted(async () => {
  await loadWatchlistData();
  readRouteFilters();
  await nextTick();
});

async function loadWatchlistData() {
  const data = await fetchDashboard();
  bookmarkedThemes.value = data.themes
    .filter((theme) => (theme.bookmarkedEventCount ?? 0) > 0)
    .sort((left, right) => {
      const leftTime = new Date(left.latestBookmarkedAt ?? 0).getTime();
      const rightTime = new Date(right.latestBookmarkedAt ?? 0).getTime();
      return rightTime - leftTime;
    });
  bookmarkedEvents.value = [...(data.bookmarkedEvents ?? [])].sort((left, right) => {
    const leftTime = new Date(left.bookmarkedAt ?? left.occurredAt).getTime();
    const rightTime = new Date(right.bookmarkedAt ?? right.occurredAt).getTime();
    return rightTime - leftTime;
  });
}

function toggleEventSelection(eventId: string) {
  if (selectedEventIds.value.includes(eventId)) {
    selectedEventIds.value = selectedEventIds.value.filter((id) => id !== eventId);
    return;
  }

  selectedEventIds.value = [...selectedEventIds.value, eventId];
}

function toggleSelectAllVisible(checked: boolean) {
  const visibleIds = filteredEvents.value.map((event) => event.id);

  if (checked) {
    selectedEventIds.value = Array.from(new Set([...selectedEventIds.value, ...visibleIds]));
    return;
  }

  selectedEventIds.value = selectedEventIds.value.filter((id) => !visibleIds.includes(id));
}

function toggleThemeSelection(themeId: string) {
  if (selectedThemeIds.value.includes(themeId)) {
    selectedThemeIds.value = selectedThemeIds.value.filter((id) => id !== themeId);
    return;
  }

  selectedThemeIds.value = [...selectedThemeIds.value, themeId];
}

function toggleSelectAllVisibleThemes(checked: boolean) {
  const visibleIds = filteredThemes.value.map((theme) => theme.id);

  if (checked) {
    selectedThemeIds.value = Array.from(new Set([...selectedThemeIds.value, ...visibleIds]));
    return;
  }

  selectedThemeIds.value = selectedThemeIds.value.filter((id) => !visibleIds.includes(id));
}

async function handleUpdateWatchlistEvent(
  eventId: string,
  input: {
    isRead?: boolean;
    isBookmarked?: boolean;
  },
  action: string,
) {
  savingEventId.value = eventId;
  pendingEventAction.value = action;
  operationNotice.value = null;

  try {
    await updateEvent(eventId, input);
    await loadWatchlistData();
    setOperationNotice(
      action === "read"
        ? "事件已标记为已读。"
        : action === "unread"
          ? "事件已重新标记为未读。"
          : "事件已取消收藏。",
      action === "read"
        ? [
            { label: "继续处理待复盘事件", to: watchlistTarget({ completion: "pending", unread: true, useType: false }) },
            { label: "查看已读收藏事件", to: { path: "/events", query: { bookmark: "bookmarked", read: "read", sort: "bookmarkedAt" } } },
          ]
        : action === "unread"
          ? [
              { label: "查看未读收藏事件", to: { path: "/events", query: { bookmark: "bookmarked", read: "unread", sort: "bookmarkedAt" } } },
              { label: "回到待复盘视图", to: watchlistTarget({ completion: "pending", unread: true, useType: false }) },
            ]
          : [
              { label: "回到观察清单", to: watchlistTarget({ completion: "all", unread: false, useType: false }) },
              { label: "查看全部收藏事件", to: { path: "/events", query: { bookmark: "bookmarked", sort: "bookmarkedAt" } } },
            ],
    );
  } finally {
    savingEventId.value = "";
    pendingEventAction.value = "";
  }
}

async function handleBulkUpdateWatchlistEvents(
  input: {
    isRead?: boolean;
    isBookmarked?: boolean;
  },
  action: string,
) {
  if (!selectedEventIds.value.length) {
    return;
  }

  bulkUpdating.value = true;
  pendingBulkAction.value = action;
  operationNotice.value = null;

  try {
    await Promise.all(selectedEventIds.value.map((eventId) => updateEvent(eventId, input)));
    selectedEventIds.value = [];
    await loadWatchlistData();
    setOperationNotice(
      action === "read"
        ? "已批量标记为已读。"
        : action === "unread"
          ? "已批量重新标记为未读。"
          : "已批量取消收藏。",
      action === "read"
        ? [
            { label: "查看已完成首轮复盘", to: watchlistTarget({ completion: "completed", unread: false, useType: false }) },
            { label: "查看已读收藏事件", to: { path: "/events", query: { bookmark: "bookmarked", read: "read", sort: "bookmarkedAt" } } },
          ]
        : action === "unread"
          ? [
          { label: "继续处理待复盘事件", to: watchlistTarget({ completion: "pending", unread: true, useType: false }) },
          { label: "查看未读收藏事件", to: { path: "/events", query: { q: query.value.trim() || undefined, bookmark: "bookmarked", read: "unread", sort: "bookmarkedAt", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
        ]
      : [
          { label: "回到观察清单", to: watchlistTarget({ completion: "all", unread: false, useType: false }) },
          { label: "查看收藏主题", to: { path: "/themes", query: { q: query.value.trim() || undefined, queue: "bookmarked", sort: "latestBookmarked", type: typeFilter.value === "all" ? undefined : typeFilter.value } } },
        ],
    );
  } finally {
    bulkUpdating.value = false;
    pendingBulkAction.value = "";
  }
}

async function handleBulkUpdateWatchlistThemes(
  input: {
    isRead?: boolean;
    isBookmarked?: boolean;
  },
  action: string,
) {
  if (!selectedThemeIds.value.length) {
    return;
  }

  bulkThemeUpdating.value = true;
  pendingThemeBulkAction.value = action;
  operationNotice.value = null;

  try {
    const targetEvents = filteredEvents.value.filter((event) => {
      if (!selectedThemeIds.value.includes(event.themeId)) {
        return false;
      }

      if (typeof input.isRead === "boolean") {
        return input.isRead ? !event.isRead : Boolean(event.isRead);
      }

      if (typeof input.isBookmarked === "boolean") {
        return input.isBookmarked ? !event.isBookmarked : Boolean(event.isBookmarked);
      }

      return true;
    });

    if (!targetEvents.length) {
      return;
    }

    await Promise.all(targetEvents.map((event) => updateEvent(event.id, input)));
    selectedThemeIds.value = [];
    await loadWatchlistData();
    setOperationNotice(
      action === "read"
        ? "选中主题下的当前观察事件已全部标记为已读。"
        : action === "unread"
          ? "选中主题下的当前观察事件已重新标记为未读。"
          : "选中主题下的当前观察事件已全部取消收藏。",
      action === "read"
        ? [
            { label: "查看已完成首轮复盘主题", to: watchlistTarget({ completion: "completed", unread: false }) },
            { label: "查看持续跟踪主题", to: watchlistTarget({ stage: "steady", completion: "completed" }) },
          ]
        : action === "unread"
          ? [
              { label: "继续处理待复盘主题", to: watchlistTarget({ completion: "pending", unread: true }) },
              { label: "查看待复盘事件", to: watchlistTarget({ completion: "pending", unread: true, useType: false }) },
            ]
          : [
              { label: "回到观察清单", to: watchlistTarget({ completion: "all", unread: false, useType: false }) },
              { label: "查看收藏主题", to: { path: "/themes", query: { queue: "bookmarked", sort: "latestBookmarked" } } },
            ],
    );
  } finally {
    bulkThemeUpdating.value = false;
    pendingThemeBulkAction.value = "";
  }
}

async function handleUpdateWatchlistThemeEvents(
  themeId: string,
  input: {
    isRead?: boolean;
    isBookmarked?: boolean;
  },
  action: string,
) {
  savingThemeId.value = themeId;
  pendingThemeAction.value = action;
  operationNotice.value = null;

  try {
    const targetEvents = filteredEvents.value.filter((event) => {
      if (event.themeId !== themeId) {
        return false;
      }

      if (typeof input.isRead === "boolean") {
        return input.isRead ? !event.isRead : Boolean(event.isRead);
      }

      if (typeof input.isBookmarked === "boolean") {
        return input.isBookmarked ? !event.isBookmarked : Boolean(event.isBookmarked);
      }

      return true;
    });

    if (!targetEvents.length) {
      return;
    }

    await Promise.all(targetEvents.map((event) => updateEvent(event.id, input)));
    await loadWatchlistData();
    setOperationNotice(
      action === "read"
        ? "本主题下的当前观察事件已全部标记为已读。"
        : action === "unread"
          ? "本主题下的当前观察事件已重新标记为未读。"
          : "本主题下的当前观察事件已全部取消收藏。",
      action === "read"
        ? [
            { label: "查看该主题时间线", to: { path: `/themes/${themeId}`, query: { section: "timeline" } } },
            { label: "查看已完成首轮复盘主题", to: watchlistTarget({ completion: "completed", unread: false }) },
          ]
        : action === "unread"
          ? [
              { label: "回到该主题待复盘事件", to: { path: "/events", query: { themeId, bookmark: "bookmarked", read: "unread", sort: "bookmarkedAt" } } },
              { label: "继续处理待复盘主题", to: watchlistTarget({ completion: "pending", unread: true }) },
            ]
          : [
              { label: "回到观察清单", to: watchlistTarget({ completion: "all", unread: false, useType: false }) },
              { label: "查看收藏主题", to: { path: "/themes", query: { queue: "bookmarked", sort: "latestBookmarked" } } },
            ],
    );
  } finally {
    savingThemeId.value = "";
    pendingThemeAction.value = "";
  }
}

function goToThemeEventStream(themeId: string, mode: "unread" | "read" | "all") {
  void router.push({
    path: "/events",
    query: {
      q: query.value.trim() || undefined,
      themeId,
      bookmark: "bookmarked",
      sort: "bookmarkedAt",
      type: typeFilter.value === "all" ? undefined : typeFilter.value,
      read: mode === "all" ? undefined : mode,
    },
  });
}

watch(
  () => route.query,
  () => {
    readRouteFilters();
  },
);

watch([query, stageFilter, typeFilter, impactFilter, completionFilter, unreadOnly], () => {
  if (selectedPhasePresetId.value) {
    const preset = phasePresets.find((item) => item.id === selectedPhasePresetId.value);
    if (!preset || !isActivePhasePreset(preset)) {
      selectedPhasePresetId.value = "";
    }
  }
  syncRouteQueryFromFilters();
  selectedEventIds.value = [];
  selectedThemeIds.value = [];
});
</script>
