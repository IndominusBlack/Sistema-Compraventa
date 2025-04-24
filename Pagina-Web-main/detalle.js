const pokemonDetail = document.getElementById('pokemon-detail');

const parametros = new URLSearchParams(window.location.search);
const nombrePokemon = parametros.get('pokemon');

if (nombrePokemon) {
    cargarDetallesPoke(nombrePokemon);
} else {
    pokemonDetail.innerHTML = '<p>Error: No se proporcionó un Pokémon válido.</p>';
}

async function cargarDetallesPoke(name) {
    try {
        const pokemon = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        const especie = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${name}`);

        if (!pokemon.ok || !especie.ok) {
            throw new Error('Error al cargar los datos del Pokémon.');
        }

        const datosPokemon = await pokemon.json();
        const datosEspecie = await especie.json();

        mostrarDetallesPoke(datosPokemon, datosEspecie);
    } catch (error) {
        console.error(error);
        pokemonDetail.innerHTML = '<p>Error al cargar los detalles del Pokémon.</p>';
    }
}

function mostrarDetallesPoke(pokemon, especies) {
    let typeList = [];
    for (let i = 0; i < pokemon.types.length; i++) {
        typeList.push(pokemon.types[i].type.name);
    }

    let listaHabilidades = [];
    for (let i = 0; i < pokemon.abilities.length; i++) {
        listaHabilidades.push(pokemon.abilities[i].ability.name);
    }

    let statsHTML = '';
    for (let i = 0; i < pokemon.stats.length; i++) {
        statsHTML += `
            <tr>
                <td>${pokemon.stats[i].stat.name}</td>
                <td>${pokemon.stats[i].base_stat}</td>
            </tr>
        `;
    }

    let descripcionPokedex = 'Descripción no disponible en español.';
    for (let i = 0; i < especies.flavor_text_entries.length; i++) {
        if (especies.flavor_text_entries[i].language.name === 'es') {
            descripcionPokedex = especies.flavor_text_entries[i].flavor_text.replace(/[\n\f]/g, ' '); // Eliminamos saltos de línea
            break;
        }
    }

    pokemonDetail.innerHTML = `
        <section class="pokemon-info">
            <img src="${pokemon.sprites.other['official-artwork'].front_default}" alt="${pokemon.name}">
            <h2>${pokemon.name}</h2>
            <p><strong>Tipo(s):</strong> ${typeList.join(', ')}</p>
            <p><strong>Habilidades:</strong> ${listaHabilidades.join(', ')}</p>
            <p><strong>Descripción:</strong> ${descripcionPokedex}</p>
        </section>

        <section class="pokemon-stats">
            <h3>Estadísticas Base</h3>
            <table>
                <thead>
                    <tr>
                        <th>Estadística</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${statsHTML}
                </tbody>
            </table>
        </section>
    `;
}
