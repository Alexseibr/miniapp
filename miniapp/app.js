(function () {
  const appEl = document.getElementById('app');
  const tg = window.Telegram?.WebApp;

  function renderHeader(user) {
    const name = user?.first_name || user?.username || 'Гость';
    return `
      <header>
        <h1>Привет, ${name}!</h1>
        <p>Выбирай категорию, чтобы посмотреть объявления в маркетплейсе.</p>
      </header>
    `;
  }

  function renderCategories(categories = []) {
    if (!categories.length) {
      return '<p>Категории пока недоступны.</p>';
    }

    const cards = categories
      .map(
        (category) => `
          <article class="category-card">
            <h3>${category.name}</h3>
            <p>${category.description || 'Объявления этой категории доступны в приложении.'}</p>
          </article>
        `
      )
      .join('');

    return `<section class="category-grid">${cards}</section>`;
  }

  function setContent(html) {
    appEl.innerHTML = html;
  }

  async function loadCategories() {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Не удалось загрузить категории');
      }
      return response.json();
    } catch (error) {
      console.error('MiniApp categories error:', error);
      return [];
    }
  }

  async function init() {
    if (tg) {
      tg.ready();
      tg.expand();
    }

    setContent('<p>Загружаем категории…</p>');

    const [categories] = await Promise.all([loadCategories()]);
    const user = tg?.initDataUnsafe?.user;

    setContent(`${renderHeader(user)}${renderCategories(categories)}`);
  }

  init();
})();
