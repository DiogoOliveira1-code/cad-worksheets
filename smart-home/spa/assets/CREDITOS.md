# Créditos dos recursos gráficos

Lista dos recursos externos usados na casa 3D, para referência no relatório.

## Biblioteca

| Recurso | Origem | Licença |
|---|---|---|
| Three.js 0.170.0 (biblioteca 3D, carregada por CDN) | https://threejs.org · https://github.com/mrdoob/three.js | MIT |

## Texturas (`assets/textures/`)

Todas obtidas do repositório oficial do Three.js, pasta `examples/textures`.

| Ficheiro | Origem no repositório | Notas |
|---|---|---|
| `hardwood2_diffuse.jpg`, `hardwood2_bump.jpg`, `hardwood2_roughness.jpg` | `examples/textures/` | Soalho de madeira (sala, quartos, escritório) |
| `tiles_diffuse.jpg`, `tiles_normal.jpg` | `examples/textures/floors/FloorsCheckerboard_S_*` | Azulejo (cozinha, casa de banho) — renomeados |
| `brick_diffuse.jpg`, `brick_bump.jpg`, `brick_roughness.jpg` | `examples/textures/` | Tijolo (muros do exterior) |
| `grass_diffuse.jpg` | `examples/textures/terrain/grasslight-big.jpg` | Relva. Original do OpenGameArt (http://opengameart.org/content/dark-grass), licença **Creative Commons Attribution 3.0**, conforme o `readme.txt` do repositório. Reduzida para 1024×1024. |

O repositório do Three.js é distribuído sob licença MIT. Antes de qualquer uso fora do
contexto académico, confirmar a licença de cada textura na origem.

## Gerados por código

Não usam ficheiros externos: reboco das paredes, alcatifa, betão, pedra do caminho,
mobília, árvores, relva em 3D, céu, estrelas, chuva e nuvens.

## Uso de Inteligência Artificial

O código da casa 3D (pasta `js/scene3d/`) foi desenvolvido com apoio do Claude (Anthropic),
conforme a secção 10 do enunciado. Declarar no relatório a ferramenta, a finalidade e o grau
de intervenção.
