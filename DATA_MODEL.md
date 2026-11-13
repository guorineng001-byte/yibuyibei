# 学习数据约定

## 书目与加载目录

`src/books.ts` 集中维护预置书目 ID、标题、科目、文件名、页数及默认原书连接状态。`catalog.ts` 与 `eduCatalog.ts` 保存对应章节、纸面页码和 PDF 页序映射。`contentCatalog.ts` 保存内容包 URL 及装载顺序，并单独列出题目练习入口。

同一书目 ID 表示同一分页版本。原书和仅去除广告的副本共用书目 ID。不同分页版本应分配新 ID，并重新提供来源页及框选。原书重连核对文件类型、页数，由用户确认分册与页序；不使用文件摘要来拒绝清理副本。

## 预置内容包 v1

现有 `ContentPack` 类型定义在 `src/content.ts`，所有预置学习包均有 `schemaVersion: 1`。它与学习备份的版本字段分别管理。

```ts
type ContentPack = {
  schemaVersion: 1;
  id: string;
  bookId: string;
  knowledge: Knowledge[];
  steps: Step[];
  ocr: Record<string, OcrPage>;
  pageRotations: Record<string, number>;
  stats: Record<string, number>;
};
```

书目 `Book.id`、章节 `Chapter.id`、知识点 `Knowledge.id`、要点 `Step.id` 在相应数据集合内唯一，确定后保持稳定。学习进度以要点 ID 为键，回忆事件同时保存要点 ID 和正文版本。改标题、调整顺序或重新导出学习包时保留 ID；修改正文通过既有 `reviseStep` 增加版本并处理对应掌握记录。

`Knowledge.bookId` 指向书目，`chapterId` 指向章节，`Step.knowledgeId` 指向知识点。`order` 决定同层顺序，`section` 与 `outlinePath` 等字段保存原书层级，禁止把原有子分支压成不区分上下位的平面列表。

`Knowledge.refs` 使用从 1 开始的实际 PDF 页码。可选 `rect` 是 `[x, y, width, height]`，取值为原页宽高的比例，坐标基于未经界面额外旋转的原页。界面旋转时通过 `rotateRect` 转换，纸面印刷页码通过书目映射显示。清理副本保持页尺寸和页序，因此沿用原定位。

`confirmed: true` 只用于已核对文字和层级的知识点。OCR 草稿保持 `confirmed: false`，不进入学习队列；`referenceOnly` 表示保留原图行列关系的参考卡，不生成背诵要点。`selected` 是用户的学习选择，`studyMode` 是要点的背诵或阅读偏好。

现有预置包可带 `replaces`、`outlineRevision` 和 `outlineBaseline`，用于已实现的教材更新；`mergeContentPack` 保留用户修订和学习记录。不要通过改包 ID 反复注入同一组知识点。

预置装载器只接受已登记的两册校对内容，继续使用现有教材更新逻辑。外部交换使用下述可交换学习包，通过书库中的“Agent 学习包”入口导入。

## 可交换学习包 v1

`src/learningPackage.ts` 定义并处理 `LearningPackage`。它复用 `Book`、`Chapter`、`Knowledge`、`Step`，不携带学习备份字段。

```ts
type LearningPackage = {
  format: 'yibuyibei-learning-package';
  schemaVersion: 1;
  book: Book;
  chapters: Chapter[];
  knowledge: Knowledge[];
  steps: Step[];
};
```

每份包对应一本书及本次涉及的章节。`book.source` 包含 `citation` 和 `rights` 两段来源事实；书目、章节、知识点和要点的 ID 在相应集合内唯一，关联指向包内实体。校验覆盖字段类型、版本、关联、页码、来源框选和层级，错误会显示具体字段或条目。未知来源页可留空 `refs`，在 `reviewNote` 中说明，不能猜写。

导入先预览新增和差异，再由用户确认。不同书目的 ID 碰撞、同一要点指向不同知识点、同书目 ID 对应不同分页版本会阻止导入。重复 ID 的相同内容不重复添加。新内容默认待校对；只有用户明确选择且包内标记确为已校对时，才保留该标记。

已有内容默认保留。采用修订时，正文改变的要点通过 `reviseStep` 增加本地版本并重置该点进度；仅标题、关键词或层级变化保留进度，阅读偏好保留。回忆事件和未涉及内容保留。知识点或要点修订会结束当前会话；给已校对知识点追加新要点也会将其重新标为待校对，保留原有要点的进度。

按整书或当前章导出时保留 ID、分页、来源、层级和校对状态。导出清除文件连接与本机绝对路径，学习勾选统一为 false，并移除要点阅读偏好；不含 `settings`、`progress`、`events`、`session`、个人题目、OCR 缓存或文件字节。跨设备恢复进度仍使用完整学习备份。

格式示例：`public/guide/learning-package-example.json`。面向用户自己 Agent 的整理约定和续接提示词：`public/guide/agent-instructions.md`。新手教程同时提供书库内界面及 `public/guide/AI_STARTER_GUIDE.md`。

## 状态、设置与文件

`AppState.schemaVersion` 当前为 1。`settings` 包含 `examType`（333/311）、`targetSchool`（可留空）、`encouragement`、`intervals`，以及保留的 `dailyNew`、`roundSize` 字段。缺少新字段的已有备份通过 `normalizeSettings` 补为 333、空院校，保留其他设置与进度。

`storage.ts` 将状态存入 IndexedDB `yibuyibei-public` 的 `state/main`，文件按书目 ID 存入 `files`。状态写入串行完成，界面显示保存结果。原书连接后清除该书的 PDF 解析缓存，再更新连接状态；原书文件不随 JSON 备份导出。

学习备份包含完整的教材实体、设置、`progress`、`events`、`assemblies`、个人题目、`essayPractice` 及当前 `session`。恢复先通过 `validateBackup` 检查实体、会话位置和要点关联，装载已登记内容，再显示确认窗口。恢复后从首页继续当前会话；没有会话的既有备份仍可恢复。已有备份中的私人 `/library/` 路径在准备状态时移除，本地文件需重新连接。

## 学习范围、方式与会话

`eligibleSteps` 仍以已勾选、已校对、非原图参考的知识点为可学范围，按书目、章节、知识点和要点的顺序排列。`ChapterPicker` 的目录使用完整可学范围，筛选不隐藏章节点，也不清除选择。`studyPickerSteps` 将全部／到期／未学与全部方式／背诵／阅读取交集，按原书顺序建立自选会话；首页到期复习仍沿用到期日期优先的队列。

批量方式通过 `setStepsStudyMode` 修改要点 `studyMode`，单要点切换复用同一函数。批量操作覆盖勾选知识点内的全部可学要点，不限于本次筛选结果。正文、版本、校对、勾选、回忆事件和掌握记录均保留。恢复背诵时，已有 `firstStudied` 且 `due` 为空的要点设为当天到期；已有日期和未学状态保持。

连续阅读复用 `Session.queue`、`initialIds`、`cursor`、`phase` 和 `readOnlyDone`，没有独立的阅读队列。`finishReadOnly` 只增加 `reads`、补记首次学习日期并标记本轮已读，不写 `events`，不改变掌握等级、独立回忆日期或已安排的到期日。阅读项不受背诵重试次数限制。当前会话里已读项改回背诵时，移除该项本轮只读完成标记，保留当前要点，后续补齐需要回忆的内容；已结束的小结保留本轮处理结果。

混合队列根据下一要点的方式进入阅读或既有背诵流程。跳到后面的要点后，`advanceSession` 会在小结前补齐较早未处理项。`SessionNavigation` 展示本次范围的原层级目录；当前知识点仍使用原要点框架。暂停不改变队列、游标或阶段，退出学习页停止计时。会话与阅读偏好随 IndexedDB 状态和完整学习备份保留，可交换学习包仍只导出教材内容。

PWA 构建用资源摘要选择离线缓存版本；摘要变化会触发一套新的静态资源缓存。这一机制只用于离线更新，不用于识别用户教材或保存个人指纹。
