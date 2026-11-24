const API_URL = 'http://3.142.68.136:3000/products';

const productList = document.querySelector('#products');
const addProductForm = document.querySelector('#add-product-form');

const updateProductForm = document.querySelector('#update-product-form');
const updateProductId = document.querySelector('#update-id');
const updateProductName = document.querySelector('#update-name');
const updateProductPrice = document.querySelector('#update-price');
const updateProductDescription = document.querySelector('#update-description');
const updateLabel = document.querySelector('#update-label');
const cancelUpdateButton = document.querySelector('#cancel-update');

const searchForm = document.querySelector('#search-form');
const searchIdInput = document.querySelector('#search-id');
const searchResult = document.querySelector('#search-result');
const clearSearchButton = document.querySelector('#clear-search');

// O backend responde com texto simples ("created!!", "updated!!", "deleted!!")
// e, em caso de erro do Supabase, com um objeto JSON. Esta função trata os dois casos.
async function readResult(response) {
  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch (e) { /* texto simples = sucesso */ }
  if (!response.ok || (parsed && parsed.message)) {
    const message = parsed && parsed.message ? parsed.message : `Erro ${response.status}`;
    alert('Erro ao comunicar com o servidor: ' + message);
    throw new Error(message);
  }
  return text;
}

function formatPrice(value) {
  const number = Number(value);
  return isNaN(number) ? value : number.toFixed(2);
}

// Cria o conteúdo (nome, preço, descrição) de um produto usando textContent (seguro contra HTML injetado)
function buildProductInfo(product) {
  const info = document.createElement('div');
  info.className = 'produto-info';

  const title = document.createElement('strong');
  title.textContent = `#${product.id} ${product.name}`;

  const price = document.createElement('span');
  price.className = 'preco';
  price.textContent = `R$ ${formatPrice(product.price)}`;

  const description = document.createElement('p');
  description.className = 'descricao';
  description.textContent = product.description ? product.description : 'Sem descrição';

  info.append(title, price, description);
  return info;
}

// Função para buscar todos os produtos do servidor
async function fetchProducts() {
  try {
    const response = await fetch(API_URL);
    const products = await response.json();

    productList.innerHTML = '';

    if (!products.length) {
      const empty = document.createElement('li');
      empty.className = 'vazio';
      empty.textContent = 'Nenhum produto cadastrado. Use o formulário para adicionar o primeiro.';
      productList.appendChild(empty);
      return;
    }

    products.forEach(product => {
      const li = document.createElement('li');
      li.appendChild(buildProductInfo(product));

      const actions = document.createElement('div');
      actions.className = 'acoes';

      // Botão de atualizar: carrega os dados no formulário de edição
      const updateButton = document.createElement('button');
      updateButton.textContent = 'Editar';
      updateButton.className = 'secundario';
      updateButton.addEventListener('click', () => openUpdateForm(product));

      // Botão de excluir
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Excluir';
      deleteButton.className = 'perigo';
      deleteButton.addEventListener('click', async () => {
        if (!confirm(`Excluir "${product.name}"?`)) return;
        await deleteProduct(product.id);
        if (updateProductId.value == product.id) closeUpdateForm();
        await fetchProducts();
      });

      actions.append(updateButton, deleteButton);
      li.appendChild(actions);
      productList.appendChild(li);
    });
  } catch (error) {
    productList.innerHTML = '';
    const errorItem = document.createElement('li');
    errorItem.className = 'vazio';
    errorItem.textContent = 'Não foi possível carregar os produtos. Verifique se o servidor está no ar.';
    productList.appendChild(errorItem);
    console.error(error);
  }
}

// ----- ADICIONAR -----
addProductForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = addProductForm.elements['name'].value;
  const price = addProductForm.elements['price'].value;
  const description = addProductForm.elements['description'].value;
  await addProduct(name, price, description);
  addProductForm.reset();
  await fetchProducts();
});

async function addProduct(name, price, description) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price, description })
  });
  return readResult(response);
}

// ----- EXCLUIR -----
async function deleteProduct(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  return readResult(response);
}

// ----- ATUALIZAR -----
function openUpdateForm(product) {
  updateProductId.value = product.id;
  updateProductName.value = product.name;
  updateProductPrice.value = product.price;
  updateProductDescription.value = product.description || '';
  updateLabel.textContent = `#${product.id}`;
  updateProductForm.hidden = false;
  updateProductForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  updateProductName.focus();
}

function closeUpdateForm() {
  updateProductForm.reset();
  updateProductId.value = '';
  updateLabel.textContent = '';
  updateProductForm.hidden = true;
}

updateProductForm.addEventListener('submit', async event => {
  event.preventDefault();
  await updateProduct(
    updateProductId.value,
    updateProductName.value,
    updateProductPrice.value,
    updateProductDescription.value
  );
  closeUpdateForm();
  await fetchProducts();
});

cancelUpdateButton.addEventListener('click', closeUpdateForm);

async function updateProduct(id, name, price, description) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price, description })
  });
  return readResult(response);
}

// ----- CONSULTAR POR ID -----
async function fetchProductById(id) {
  const response = await fetch(`${API_URL}/${id}`);
  if (!response.ok) return null;
  const data = await response.json();
  // Aceita tanto objeto quanto array com um item
  const product = Array.isArray(data) ? data[0] : data;
  return product && product.id !== undefined ? product : null;
}

searchForm.addEventListener('submit', async event => {
  event.preventDefault();
  searchResult.innerHTML = '';
  searchResult.className = 'resultado';

  try {
    const product = await fetchProductById(searchIdInput.value);
    if (!product) {
      searchResult.classList.add('erro');
      searchResult.textContent = `Nenhum produto encontrado com o ID ${searchIdInput.value}.`;
      return;
    }
    searchResult.classList.add('ok');
    searchResult.appendChild(buildProductInfo(product));
  } catch (error) {
    searchResult.classList.add('erro');
    searchResult.textContent = 'Erro ao consultar o servidor.';
    console.error(error);
  }
});

clearSearchButton.addEventListener('click', () => {
  searchForm.reset();
  searchResult.innerHTML = '';
  searchResult.className = 'resultado';
});

// Carrega os produtos ao abrir a página
fetchProducts();
