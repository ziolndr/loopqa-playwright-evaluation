import { expect } from '@playwright/test';

// The demo's visible text may include a count or vary in capitalization.
// Match the complete column heading rather than incidental occurrences in cards.
export const COLUMN_HEADINGS = Object.freeze({
  'To Do': /^\s*to[\s-]*do(?:\s*[:(\[]?\s*\d+\s*(?:tasks?)?\s*[)\]]?)?\s*$/i,
  'In Progress': /^\s*in[\s-]*progress(?:\s*[:(\[]?\s*\d+\s*(?:tasks?)?\s*[)\]]?)?\s*$/i,
  Done: /^\s*done(?:\s*[:(\[]?\s*\d+\s*(?:tasks?)?\s*[)\]]?)?\s*$/i
});

const COLUMN_CONTAINER_SELECTOR = [
  '[data-testid*="column"]',
  '[data-status]',
  'section',
  'article',
  '[role="group"]',
  '[role="list"]',
  'div'
].join(', ');

export class BoardPage {
  constructor(page) {
    this.page = page;
  }

  async openProject(project, taskName) {
    // Click a navigation control, not a possibly repeated heading in the board.
    const navigation = this.page.locator('aside, nav, [role="navigation"]');
    const sidebarText = navigation.getByText(project, { exact: true }).first();
    const projectControl = (await sidebarText.count()) > 0
      ? sidebarText
      : this.page.getByText(project, { exact: true }).first();

    await expect(projectControl, `Project navigation '${project}' must be visible`).toBeVisible();
    await projectControl.click();

    // A board-specific task is stronger proof of navigation than a hardcoded
    // status-heading spelling. Any missing task will produce a useful snapshot.
    const target = this.page.getByText(taskName, { exact: true }).first();
    try {
      await expect(target, `Project '${project}' must show task '${taskName}'`).toBeVisible();
    } catch (error) {
      throw new Error(
        `Unable to locate '${taskName}' after opening '${project}'.\n` +
        `Page snapshot:\n${await this.diagnosticSnapshot()}\n` +
        `Original error: ${error.message}`
      );
    }
  }

  column(columnName, taskName) {
    const heading = COLUMN_HEADINGS[columnName];
    if (!heading) throw new Error(`Unknown board column: ${columnName}`);

    const otherHeadings = Object.entries(COLUMN_HEADINGS)
      .filter(([name]) => name !== columnName)
      .map(([, pattern]) => this.page.getByText(pattern));

    // Smallest common container of this header and THIS task, explicitly
    // excluding any container that also contains another column header.
    // This prevents asserting against the entire board or a sibling column.
    let root = this.page.locator(COLUMN_CONTAINER_SELECTOR)
      .filter({ has: this.page.getByText(heading) })
      .filter({ has: this.page.getByText(taskName, { exact: true }) });
    for (const other of otherHeadings) root = root.filter({ hasNot: other });
    return root.last();
  }

  async taskCard(column, taskName, tags) {
    const title = column.getByText(taskName, { exact: true });
    await expect(title, `Task '${taskName}' must be in the expected column`).toBeVisible();
    await expect(title, `Task '${taskName}' should appear once in its column`).toHaveCount(1);

    // Prefer a real card boundary when the markup supplies one.
    const namedCard = title.locator(
      'xpath=ancestor::*[self::article or self::li or @role="listitem" or @draggable="true" or @data-testid="task-card" or contains(concat(" ", normalize-space(@class), " "), " task-card ")][1]'
    );
    if (await namedCard.count()) return namedCard;

    // For unannotated div-based cards, choose the nearest ancestor containing
    // the task title and all required badges. Never fall back to the column.
    let candidate = title.locator('xpath=..');
    for (let depth = 0; depth < 7; depth++) {
      const current = candidate;
      if (await current.count() === 0) break;
      const isColumn = await current.evaluate((el) => {
        const text = el.innerText || '';
        return /(?:^|\n)\s*(to\s*do|in\s*progress|done)\s*(?:\d+)?\s*(?:\n|$)/i.test(text);
      });
      if (isColumn) break;
      const badgesPresent = await Promise.all(tags.map(tag =>
        current.getByText(tag, { exact: true }).count()
      ));
      if (badgesPresent.every(n => n > 0)) return current;
      candidate = candidate.locator('xpath=..');
    }
    throw new Error(`No task-card container with required badges for '${taskName}'.\n${await this.diagnosticSnapshot()}`);
  }

  async assertTask({ column: expectedColumn, task, tags }) {
    const column = this.column(expectedColumn, task);
    await expect(column, `Column '${expectedColumn}' must contain task '${task}'`).toBeVisible();
    const card = await this.taskCard(column, task, tags);
    await expect(card, `Card '${task}' must be visible`).toBeVisible();
    for (const tag of tags) {
      await expect(card.getByText(tag, { exact: true }),
        `Task '${task}' must have tag '${tag}' inside its card`
      ).toBeVisible();
    }
  }

  async diagnosticSnapshot() {
    return JSON.stringify(await this.page.evaluate(() => ({
      url: location.href,
      title: document.title,
      headings: [...document.querySelectorAll('h1,h2,h3,h4,[role="heading"]')]
        .map(el => el.innerText?.trim()).filter(Boolean).slice(0, 40),
      navigation: [...document.querySelectorAll('aside,nav,[role="navigation"]')]
        .map(el => el.innerText?.trim()).filter(Boolean).slice(0, 5),
      visiblePageText: document.body?.innerText?.slice(0, 5500) ?? ''
    })), null, 2);
  }
}
