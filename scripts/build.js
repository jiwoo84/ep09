// 간단한 build 프로세스 만들기

import fs from "fs-extra";
// fs-extra: FS룰 프라미스로 반환하는 라이브러리
// 콜백을 사용하지 않아도 되어 편리함
import config from "../config.js";

// 템플릿 엔진 (지정된 템플릿 양식과 데이터를 합쳐서 html 문서를 출력)
import Mustache from "mustache";

// MD파일 상단에 정보를 넣어주면 그걸 읽는 기능
import frontMatter from "front-matter";

// md를 html로 변환
import showdown from "showdown";

const ASSETS = config.build.assets;
const DIST = config.build.dist;
const PAGES = config.build.pages;
const CONTENTS = config.build.contents;
const CONTENTS_SLUG = config.build.contentsSlug;

async function renderFile(source, dest) {
  const recentPosts = await getRecentPosts();
  const file = await fs.readFile(source);
  const result = Mustache.render(file.toString(), { ...config, recentPosts });
  await fs.writeFile(dest, result);
}

async function getRecentPosts() {
  const files = await fs.readdir(CONTENTS);
  const result = [];
  for (const file of files) {
    const { attributes } = frontMatter(
      (await fs.readFile(`${CONTENTS}/${file}/index.md`)).toString()
    );
    result.push({
      ...attributes,
      path: `/${CONTENTS_SLUG}/${attributes.slug}`,
    });
  }
  return result;
}

async function buildHtmlFiles() {
  const files = await fs.readdir(PAGES);
  for (const file of files) {
    if (file === "index.html") {
      await renderFile(`${PAGES}/${file}`, `${DIST}/${file}`);
    } else {
      const folderName = file.split(".html")[0];
      await fs.mkdir(`${DIST}/${folderName}`);
      await renderFile(`${PAGES}/${file}`, `${DIST}/${folderName}/index.html`);
    }
  }
}

async function buildContentsFiles() {
  const files = await fs.readdir(CONTENTS);
  await fs.mkdir(`${DIST}/${CONTENTS_SLUG}`);

  for (const file of files) {
    const { attributes, body } = frontMatter(
      (await fs.readFile(`${CONTENTS}/${file}/index.md`)).toString()
    );
    const template = await fs.readFile("templates/post.html");
    const bodyHtml = new showdown.Converter().makeHtml(body);
    const html = Mustache.render(template.toString(), {
      ...config,
      post: config.updatePost({ ...attributes, body: bodyHtml }),
    });
    await fs.mkdir(`${DIST}/${CONTENTS_SLUG}/${file}`);
    await fs.writeFile(`${DIST}/${CONTENTS_SLUG}/${file}/index.html`, html);
  }
}

async function copyAssets() {
  const files = await fs.readdir(ASSETS);
  for (const file of files) {
    await fs.copy(`${ASSETS}/${file}`, `${DIST}/${file}`);
  }
}

async function build() {
  await fs.mkdir(DIST);

  await copyAssets();
  await buildHtmlFiles();
  await buildContentsFiles();
}

build();
