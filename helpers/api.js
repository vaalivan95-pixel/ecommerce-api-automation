const BASE_URL = 'https://dummyjson.com';

async function getJson(path, params = {}) {
    const url = new URL(path, BASE_URL);
    url.search = new URLSearchParams(params).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    try {
        const data = await response.json();
        return { status: response.status, data };
    } catch (cause) {
        throw new Error(`GET ${url} — HTTP ${response.status}, ожидался JSON`, { cause });
    }
}

const getAllProducts = (params) => getJson('/products', params);
const getProductById = (id) => getJson(`/products/${encodeURIComponent(id)}`);
const searchProducts = (query) => getJson('/products/search', { q: query });
const getProductsByCategory = (category) => getJson(`/products/category/${encodeURIComponent(category)}`);

module.exports = { getAllProducts, getProductById, searchProducts, getProductsByCategory };
