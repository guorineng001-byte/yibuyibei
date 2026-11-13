# 一步一背教材整理任务

请把我提供的教材页或文字，整理成“一步一背学习包”。只依据我提供的材料，保持原书标题、编号与上下位关系。一次先处理一节或几页，完成后再继续。

生成前确认：教材书名、科目、文件类型、原 PDF 总页数、本次处理的原 PDF 页码范围。PDF 页码包含封面与目录，不能拿纸面印刷页码替代。缺少信息先向我询问；图中文字无法辨认或页码无法确认时保留待核对说明，不猜写正文。

输出一个完整的 JSON 对象，format 为 yibuyibei-learning-package，schemaVersion 为 1。给出可下载的 .json 文件；如果当前工具不能生成文件，直接返回完整 JSON 代码块，不要省略数组或使用“其余同上”。

## 数据格式

顶层仅包含 format、schemaVersion、book、chapters、knowledge、steps。

- book：id、title、subject、filename、pages、offset、kind、source。kind 是 pdf 或 docx；Word 文字材料 pages=1、offset=0。source 含 citation（书名、作者、版本等来源事实）和 rights（已知使用范围；没有授权资料就写“未提供授权范围说明”，不把第三方教材写成 MIT）。不包含本机绝对路径、sourceUrl、原文件字节或个人目标资料。
- chapters：每项含 id、bookId、title、start、end、order；start/end 是实际 PDF 页码，范围不得超过 book.pages。
- knowledge：每项含 id、bookId、chapterId、title、refs、confirmed、selected、order，可带 section、reviewNote、referenceOnly。本次整理的 confirmed=false、selected=false，由我对照原书确认。refs 是来源数组，项形如 {"page":12}，准确知道原页框选时才增加 rect:[x,y,width,height]（原页宽高比例）。无法确定来源页时使用 refs:[] 并在 reviewNote 说明。
- steps：每项含 id、knowledgeId、title、text、keywords、order、version。一个要点讲清一个意思，keywords 为简短提示词数组，version 初始为 1；可用 outlinePath 表示从上到下的原书层级，最多 8 层，可带 displayTitle、outline、subsection。不要替我决定只阅读或背诵方式。
- referenceOnly=true 的知识点用于原图表格参考，不放背诵要点。无法准确保留原图行列含义时保留原图参考，不把猜出的表格文本标成校对完成。

## ID 与续接

同一 book.id 表示同一分页版本。新书为书目、章节、知识点、要点分配独立稳定 ID，例如 my-book-v1、my-book-v1-ch1、my-book-v1-k1、my-book-v1-k1-s1。不同条目不能重复 ID，所有关联字段必须指向本包中对应条目。

如果我同时提供了从程序导出的学习包，沿用其中同一条目的 ID 和书目分页信息。修正文案只修改相同 ID 的内容；追加章节使用新 ID。学习包可以只包含本次涉及的章节，但要包含这些要点所依赖的章节和知识点。不要因为标题改变而换 ID，不要删除不在本次处理范围内的内容。

## 交付

先给出本次章节、知识点和要点的数量，以及还需我对照的疑问，再给完整 JSON。不要在 JSON 里放 progress、events、settings、session、OCR 缓存或学习记录。确认所有知识点和要点关联完整，来源页没有超出范围，输出能直接解析的 JSON。

我会在程序中预览、导入、核对原书，再开始学习。
