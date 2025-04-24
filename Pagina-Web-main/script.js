const pokemonList = document.getElementById('pokemon-list');
const typeButtons = document.querySelectorAll('.barra img');
const sortSelect = document.getElementById('type-filter');
const searchInput = document.getElementById('search');

let pokemonTotal = []; // Guardamos todos los Pokémon
let tiposSeleccionados = []; // Aquí guardaremos los tipos seleccionados

// Cargar Pokémon
async function cargarPokemon() {
    const respuesta = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
    const datos = await respuesta.json();
    const resultados = datos.results;

    for (let i = 0; i < resultados.length; i++) {
        const pokemonData = await obtenerDetallesPoke(resultados[i].url);
        pokemonTotal.push(pokemonData);
        crearTarjetaPoke(pokemonData, i + 1);
    }
}

// Obtener detalles de un Pokémon
async function obtenerDetallesPoke(url) {
    const respuesta = await fetch(url);
    return respuesta.json();
}

// Crear tarjeta de Pokémon
function crearTarjetaPoke(pokemon, numero) {
    const tipos = pokemon.types.map(type => type.type.name);

    const tarjeta = document.createElement('div');
    tarjeta.className = 'pokemon-card';
    tarjeta.setAttribute('data-types', tipos.join(',')); // Guardamos los tipos en el dataset
    tarjeta.setAttribute('data-number', numero); // Guardamos el número de la Pokédex
    tarjeta.setAttribute('data-name', pokemon.name); // Guardamos el nombre
    tarjeta.innerHTML = `
        <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
        <h3>#${numero.toString().padStart(3, '0')} ${pokemon.name}</h3>
        <p>${tipos.join(', ')}</p>
    `;

    tarjeta.addEventListener('click', () => {
        window.location.href = `detalle.html?pokemon=${pokemon.name}`;
    });

    pokemonList.appendChild(tarjeta);
}

// Filtrar Pokémon combinando búsqueda y tipo
function filtrarPokemon() {
    const searchTerm = searchInput.value.toLowerCase();
    const tarjetas = document.querySelectorAll('.pokemon-card');

    tarjetas.forEach(card => {
        const nombre = card.getAttribute('data-name').toLowerCase();
        const tiposCartas = card.getAttribute('data-types').split(',');

        const matchesSearch = nombre.includes(searchTerm);
        const matchesType =
            tiposSeleccionados.length === 0 ||
            (tiposSeleccionados.length <= 2 && tiposSeleccionados.every(tipo => tiposCartas.includes(tipo)));

        if (matchesSearch && matchesType) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Manejo de selección de tipos (máximo 2 seleccionados)
typeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tipo = button.getAttribute('data-type');

        if (tiposSeleccionados.includes(tipo)) {
            // Si ya estaba seleccionado, lo quitamos
            tiposSeleccionados = tiposSeleccionados.filter(t => t !== tipo);
            button.classList.remove('selected'); 
        } else {
            // Si hay menos de 2 tipos seleccionados, lo añadimos
            if (tiposSeleccionados.length < 2) {
                tiposSeleccionados.push(tipo);
                button.classList.add('selected');
            }
        }
        // Aplicamos el filtrado combinado
        filtrarPokemon();
    });
});

// Evento para búsqueda dinámica
searchInput.addEventListener('input', filtrarPokemon);

// Ordenar Pokémon
function ordenarPokemon(criteria) {
    const tarjetas = Array.from(document.querySelectorAll('.pokemon-card'));

    tarjetas.sort((a, b) => {
        if (criteria === 'name') {
            return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'));
        } else if (criteria === 'number') {
            return parseInt(a.getAttribute('data-number')) - parseInt(b.getAttribute('data-number'));
        }
        return 0;
    });

    pokemonList.innerHTML = ""; // Limpiamos la lista
    tarjetas.forEach(tarjeta => pokemonList.appendChild(tarjeta)); // Reagregamos en orden
}

// Evento para ordenar Pokémon
sortSelect.addEventListener('change', () => {
    const valor = sortSelect.value;
    if (valor === 'name') {
        ordenarPokemon('name');
    } else if (valor === 'number') {
        ordenarPokemon('number');
    }
});

// Cargar Pokémon al iniciar
cargarPokemon();
