const test = require('node:test');
const assert = require('node:assert/strict');
const { getAllProducts, getProductById, searchProducts, getProductsByCategory } = require('../helpers/api');

function readList({ status, data }) {
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.products), 'Ожидался массив products');
    return data.products;
}

async function getNonEmptyProductList() {
    const products = readList(await getAllProducts());
    assert.ok(products.length > 0, 'Каталог пуст');
    return products;
}

function checkPrice(product) {
    assert.ok(Number.isFinite(product.price) && product.price > 0, `Некорректная цена товара ${product.id}: ${product.price}`);
}

test('GET /products возвращает непустой список', async () => {
    await getNonEmptyProductList();
});

test('У каждого товара есть обязательные поля', async () => {
    for (const [index, product] of (await getNonEmptyProductList()).entries()) {
        for (const field of ['id', 'title', 'price']) {
            assert.ok(Object.hasOwn(product, field), `products[${index}]: отсутствует ${field}`);
        }
    }
});

test('Поля товара имеют ожидаемые типы, название заполнено', async () => {
    for (const [index, product] of (await getNonEmptyProductList()).entries()) {
        assert.equal(typeof product.id, 'number', `products[${index}].id`);
        assert.equal(typeof product.title, 'string', `products[${index}].title`);
        assert.ok(product.title.trim().length > 0, `Пустой title у товара ${product.id}`);
        assert.equal(typeof product.price, 'number', `products[${index}].price`);
    }
});

test('Цена каждого товара положительна и конечна', async () => {
    (await getNonEmptyProductList()).forEach(checkPrice);
});

test('Получение товара по ID', async () => {
    const { status, data } = await getProductById(5);
    assert.equal(status, 200);
    assert.equal(data.id, 5);
    assert.equal(typeof data.title, 'string');
    assert.ok(data.title.trim().length > 0);
    checkPrice(data);
});

test('Несуществующий товар возвращает 404 с описанием ошибки', async () => {
    const { status, data } = await getProductById(9999999);
    assert.equal(status, 404);
    assert.ok(data !== null && typeof data === 'object' && !Array.isArray(data));
    assert.ok(Object.hasOwn(data, 'message'));
    assert.equal(typeof data.message, 'string');
    assert.ok(data.message.trim().length > 0);
});

test('Поиск находит известный товар и возвращает пустую выдачу для отсутствующего', async () => {
    const [known] = await getNonEmptyProductList();
    const response = await searchProducts(known.title);
    const matches = readList(response);
    assert.ok(matches.some(product => product.id === known.id), `Не найден товар ${known.id}`);
    assert.ok(Number.isInteger(response.data.total) && response.data.total >= matches.length);
    for (const product of matches) {
        assert.equal(typeof product.id, 'number');
        assert.equal(typeof product.title, 'string');
        assert.ok(product.title.trim().length > 0);
    }
    const missing = await searchProducts('qa-missing-974db16e');
    assert.deepEqual(readList(missing), []);
    assert.equal(missing.data.total, 0);
});

test('Пагинация возвращает товары с ожидаемым смещением', async () => {
    const order = { sortBy: 'id', order: 'asc' };
    const first = readList(await getAllProducts({ ...order, limit: 15 }));
    assert.equal(first.length, 15);
    const response = await getAllProducts({ ...order, limit: 5, skip: 10 });
    const ids = readList(response).map(product => product.id);
    assert.equal(response.data.limit, 5);
    assert.equal(response.data.skip, 10);
    assert.ok(ids.every(id => typeof id === 'number'));
    assert.equal(new Set(ids).size, 5);
    assert.deepEqual(ids, first.slice(10, 15).map(product => product.id));
});

test('Фильтр категории возвращает только смартфоны', async () => {
    const response = await getProductsByCategory('smartphones');
    const products = readList(response);
    assert.ok(products.length > 0);
    assert.ok(Number.isInteger(response.data.total) && response.data.total >= products.length);
    for (const product of products) {
        assert.equal(product.category, 'smartphones');
        assert.equal(typeof product.id, 'number');
        checkPrice(product);
    }
});

test('Сортировка возвращает десять товаров по неубыванию цены', async () => {
    const products = readList(await getAllProducts({ sortBy: 'price', order: 'asc', limit: 10 }));
    assert.equal(products.length, 10);
    products.forEach(checkPrice);
    const prices = products.map(product => product.price);
    assert.ok(prices.every((price, index) => index === 0 || price >= prices[index - 1]), 'Нарушен порядок цен');
});
