# Entrega final - Orquestación con Docker Compose

Arquitectura de Software 2 - Instituto Tecnológico Metropolitano

## Integrantes

- David Stiven Franco Lopez
- Simon Pulgarin Mejia
- Harol Stiven Restrepo Restrepo
- Mauricio Agudelo Jiménez
- Juan Sebastian Echeverri Gallego

## Descripción

Despliegue en contenedores Docker del sistema formado por la **API Festivos** (Express JS +
MongoDB) y la **API Calendario** (Spring Boot + PostgreSQL). Cada API corre en su propio
contenedor junto a su propia base de datos, y la API Calendario es cliente de la API
Festivos. Los cuatro contenedores se orquestan con un solo archivo
[docker-compose.yml](docker-compose.yml) y se comunican por una red común, llamándose por el
nombre del contenedor en lugar de `localhost`.

**Este repositorio es autocontenido.** Trae el código completo de las dos APIs, sus
Dockerfiles, los scripts de las bases de datos y el `docker-compose.yml`. No depende de
ningún otro repositorio:

| Carpeta | Contenido |
|---|---|
| [api-festivos/](api-festivos/) | Código de la API Festivos ([README](api-festivos/README.md)), su [Dockerfile](api-festivos/Dockerfile) y, en [bd/](api-festivos/bd/), el script de datos y el Dockerfile de MongoDB |
| [api-calendario/](api-calendario/) | Código de la API Calendario ([README](api-calendario/README.md)), su [Dockerfile](api-calendario/Dockerfile) y, en [bd/](api-calendario/bd/), los scripts SQL y el Dockerfile de PostgreSQL |
| [docker-compose.yml](docker-compose.yml) | Orquestación de los 4 contenedores, la red y los volúmenes |
| [EVIDENCIAS.md](EVIDENCIAS.md) | Evidencia de la ejecución: construcción, estado de los contenedores, pruebas de cada servicio y de la integración, con capturas en [evidencias/](evidencias/) |

## Diagrama de despliegue

```mermaid
flowchart LR
    consumidor["Consumidor<br/>(navegador, curl o Postman)"]
    clientebd["Cliente de BD<br/>(MongoDB Compass o pgAdmin)"]

    subgraph host["Equipo anfitrión con Docker"]
        subgraph red["Red Docker: red-calendario"]
            direction LR
            apicalendario["<b>dockerapicalendario</b><br/>[Contenedor: Java 17 + Spring Boot]<br/>API Calendario"]
            apifestivos["<b>dockerapifestivos</b><br/>[Contenedor: Node.js 22 + Express]<br/>API Festivos"]
            bdcalendario[("<b>dockerbdcalendario</b><br/>[Contenedor: PostgreSQL 16]<br/>BD calendario")]
            bdfestivos[("<b>dockerbdfestivos</b><br/>[Contenedor: MongoDB 8]<br/>BD festivos")]
        end
        volcal[["Volumen datos-calendario"]]
        volfes[["Volumen datos-festivos"]]
    end

    consumidor -- "HTTP :8080" --> apicalendario
    consumidor -- "HTTP :3030" --> apifestivos
    clientebd -. ":5433" .-> bdcalendario
    clientebd -. ":27018" .-> bdfestivos
    apicalendario -- "GET /api/festivos/obtener/{anio}<br/>http://dockerapifestivos:3030" --> apifestivos
    apicalendario -- "JDBC<br/>dockerbdcalendario:5432" --> bdcalendario
    apifestivos -- "MongoDB<br/>dockerbdfestivos:27017" --> bdfestivos
    bdcalendario -.- volcal
    bdfestivos -.- volfes

    classDef contenedor fill:#1168bd,stroke:#0b4884,color:#ffffff
    classDef basedatos fill:#438dd5,stroke:#2e6295,color:#ffffff
    classDef externo fill:#999999,stroke:#6b6b6b,color:#ffffff
    class apicalendario,apifestivos contenedor
    class bdcalendario,bdfestivos basedatos
    class consumidor,clientebd externo
```

Las APIs publican en el equipo anfitrión los puertos `3030` y `8080`. Las bases de datos se
publican en `27018` (MongoDB) y `5433` (PostgreSQL), como en el ejemplo de clase, para poder
revisarlas desde el equipo con MongoDB Compass o pgAdmin. Se usan esos puertos y no los
estándar (`27017` y `5432`) para no chocar con un MongoDB o un PostgreSQL instalados en el
equipo. Dentro de la red `red-calendario`, las APIs se conectan a las bases de datos por los
puertos internos de siempre.

## Requisitos

| Software | Comprobar con |
|---|---|
| Docker Desktop (Windows y macOS) o Docker Engine con el plugin Compose (Linux) | `docker compose version` |

No hace falta tener instalado Node.js, Java, Maven, MongoDB ni PostgreSQL: todo se descarga
y se compila dentro de las imágenes. Los puertos `3030`, `8080`, `27018` y `5433` del equipo
deben estar libres (por ejemplo, sin las APIs de la tercera y cuarta entrega corriendo en
local).

## Ejecución

Desde la raíz del repositorio:

```bash
docker compose up --build
```

La primera vez tarda unos minutos, porque descarga las imágenes base y compila la API
Calendario con Maven. Docker levanta los contenedores en este orden (`depends_on`):

1. `dockerbdfestivos` y `dockerbdcalendario`. Con el volumen vacío cargan sus scripts de datos.
2. `dockerapifestivos`, cuando MongoDB está sano (`healthcheck`): ya tiene los datos de los
   festivos.
3. `dockerapicalendario`, cuando PostgreSQL está sano (ya tiene las tablas) y la API Festivos
   arrancó. No espera a que la API Festivos esté sana: solo la necesita para generar el
   calendario (ver [Decisiones](#decisiones-para-revisar)).

Los cuatro contenedores tienen `healthcheck`. El sistema está listo cuando
`docker compose ps` los muestra todos como `(healthy)`. Para dejarlo corriendo en segundo
plano se usa `docker compose up --build -d`.

### Comprobar

```bash
curl http://localhost:3030/api/festivos/obtener/2026     # festivos de 2026
curl http://localhost:8080/api/calendario/generar/2026   # true
curl http://localhost:8080/api/calendario/listar/2026    # los 365 días de 2026 clasificados
```

`generar` responde `true` solo si la API Calendario consiguió llamar a la API Festivos por la
red de Docker, así que esa respuesta comprueba también la comunicación entre contenedores.

La documentación interactiva de las dos APIs queda en Swagger UI:

| API | Swagger UI |
|---|---|
| API Festivos | `http://localhost:3030/api-docs` |
| API Calendario | `http://localhost:8080/swagger-ui.html` |

Las bases de datos se pueden revisar desde el equipo:

| Base de datos | Conexión |
|---|---|
| MongoDB (`festivos`) | MongoDB Compass con `mongodb://localhost:27018` |
| PostgreSQL (`calendario`) | pgAdmin: servidor `localhost`, puerto `5433`, usuario `postgres`, clave `sa` |

Las pruebas hechas con todo el sistema corriendo, con sus resultados y capturas, están en
[EVIDENCIAS.md](EVIDENCIAS.md).

Las demás operaciones y sus ejemplos están en el README de cada API:
[API Festivos](api-festivos/README.md#operaciones) y
[API Calendario](api-calendario/README.md#operaciones).

En Windows, `curl` no envía en UTF-8 las tildes escritas en la línea de comandos (`-d
'{"tipo": "Día cívico"}'`): la API Calendario responde 400 por JSON no válido y la API Festivos
guarda el nombre con caracteres dañados. Para esos ejemplos se usa Postman o Swagger UI, o
se guarda el cuerpo en un archivo UTF-8 y se envía con `--data-binary @archivo.json`. En
Linux y macOS los ejemplos funcionan tal cual.

### Detener y limpiar

```bash
docker compose down      # detiene y elimina los contenedores; los datos se conservan
docker compose down -v   # además elimina los volúmenes con los datos
```

Después de `down -v`, el siguiente `docker compose up --build` crea las bases de datos desde
cero y vuelve a cargar los scripts. Con `down` sin `-v` los volúmenes se conservan y los
scripts **no** se vuelven a ejecutar (las imágenes de MongoDB y PostgreSQL solo los corren
cuando el directorio de datos está vacío).

## Contenedores

| Contenedor | Imagen | Construida desde | Puerto en el anfitrión |
|---|---|---|---|
| `dockerbdfestivos` | `dockerbdfestivos` (base `mongo:8.0`) | [api-festivos/bd/Dockerfile](api-festivos/bd/Dockerfile) | `27018` |
| `dockerapifestivos` | `dockerapifestivos` (base `node:22-alpine`) | [api-festivos/Dockerfile](api-festivos/Dockerfile) | `3030` |
| `dockerbdcalendario` | `dockerbdcalendario` (base `postgres:16`) | [api-calendario/bd/Dockerfile](api-calendario/bd/Dockerfile) | `5433` |
| `dockerapicalendario` | `dockerapicalendario` (base `eclipse-temurin:17-jre-alpine`) | [api-calendario/Dockerfile](api-calendario/Dockerfile) | `8080` |

Los nombres siguen la convención del ejemplo de clase (`dockerbdmonedas`, `dockerapimonedas`):
`dockerbd...` para las bases de datos y `dockerapi...` para las APIs. En el
`docker-compose.yml` los servicios se llaman igual sin el prefijo `docker` (`bdfestivos`,
`apifestivos`, `bdcalendario`, `apicalendario`), y dentro de la red cada contenedor se
encuentra por su nombre de contenedor.

### API Festivos

[Dockerfile](api-festivos/Dockerfile) de una etapa: parte de `node:22-alpine`, instala las
dependencias con `npm ci` (versiones exactas del `package-lock.json`) y copia el código. Las
dependencias se copian e instalan antes que el código, para que Docker reutilice esa capa
cuando solo cambia el código.

### API Calendario

[Dockerfile](api-calendario/Dockerfile) de dos etapas (*multi-stage*):

1. **Compilación** (`maven:3.9-eclipse-temurin-17`): copia el proyecto multimódulo y ejecuta
   `mvn clean package -DskipTests`, que genera `presentacion/target/apicalendario.jar`.
2. **Ejecución** (`eclipse-temurin:17-jre-alpine`): copia solo el `.jar` de la etapa anterior.
   La imagen final no lleva Maven, el código fuente ni el compilador, así que es mucho más
   liviana.

### Bases de datos

Cada base de datos tiene su propio Dockerfile, que parte de la imagen oficial y copia los
scripts a `/docker-entrypoint-initdb.d/`. La imagen oficial ejecuta esos scripts al arrancar
por primera vez:

- **MongoDB** ([api-festivos/bd/](api-festivos/bd/)): `01_BDFestivos.js` crea la colección
  `tipos` de la base de datos `festivos` con los 4 tipos y sus 19 festivos.
- **PostgreSQL** ([api-calendario/bd/](api-calendario/bd/)): `01_DDL_Calendario.sql` crea la
  base de datos `calendario` y las tablas `Tipo` y `Calendario`, y `02_DML_Calendario.sql`
  carga el catálogo de tipos. Los scripts se ejecutan en orden alfabético, y el prefijo
  numérico asegura que el DDL corra antes que el DML.

Los datos se guardan en los volúmenes `datos-festivos` y `datos-calendario`, de modo que
sobreviven a `docker compose down` y a reiniciar los contenedores.

## Configuración

Las APIs leen su configuración de variables de entorno, con valores por defecto para correr
en local (`localhost`). En Docker, el `docker-compose.yml` le da a cada variable el nombre del
contenedor correspondiente. El único cambio frente al código de la tercera y cuarta entrega es
que el Swagger de la API Festivos ya no tiene fija la URL `http://localhost:3030` (variable
`URL_PUBLICA`, ver [Decisiones](#decisiones-para-revisar)).

### API Festivos

| Variable | Valor por defecto (local) | Valor en Docker |
|---|---|---|
| `PUERTO` | `3030` | `3030` |
| `BD_SERVIDOR` | `localhost` | `dockerbdfestivos` |
| `BD_PUERTO` | `27017` | `27017` |
| `BD_BASEDATOS` | `festivos` | `festivos` |
| `BD_USUARIO` / `BD_CLAVE` | vacíos (sin autenticación) | vacíos (sin autenticación) |
| `URL_PUBLICA` | `/` (la dirección desde la que se abre Swagger UI) | sin definir (`/`) |

### API Calendario

| Variable | Valor por defecto (local) | Valor en Docker |
|---|---|---|
| `PUERTO` | `8080` | `8080` |
| `BD_SERVIDOR` | `localhost` | `dockerbdcalendario` |
| `BD_PUERTO` | `5432` | `5432` |
| `BD_BASEDATOS` | `calendario` | `calendario` |
| `BD_USUARIO` / `BD_CLAVE` | `postgres` / `sa` | `postgres` / `sa` |
| `API_FESTIVOS_URL` | `http://localhost:3030` | `http://dockerapifestivos:3030` |

### Bases de datos

| Contenedor | Variable | Valor | Definida en |
|---|---|---|---|
| `dockerbdfestivos` | `MONGO_INITDB_DATABASE` | `festivos` | [api-festivos/bd/Dockerfile](api-festivos/bd/Dockerfile) |
| `dockerbdcalendario` | `POSTGRES_USER` / `POSTGRES_PASSWORD` | `postgres` / `sa` | [docker-compose.yml](docker-compose.yml) |

Dentro de un contenedor, `localhost` es el propio contenedor. Por eso la API Calendario no
puede llamar a `http://localhost:3030`: la API Festivos está en otro contenedor. Lo encuentra
por su nombre, `dockerapifestivos`, gracias al DNS interno de la red `red-calendario`.

## Equivalente con comandos de Docker

El `docker-compose.yml` reemplaza la secuencia de comandos del Taller 4. A mano sería, desde
la raíz del repositorio:

```bash
docker network create red-calendario

docker build -t dockerbdfestivos api-festivos/bd
docker run -d --name dockerbdfestivos --network red-calendario -p 27018:27017 \
  dockerbdfestivos

docker build -t dockerapifestivos api-festivos
docker run -d --name dockerapifestivos --network red-calendario -p 3030:3030 --init \
  -e BD_SERVIDOR=dockerbdfestivos dockerapifestivos

docker build -t dockerbdcalendario api-calendario/bd
docker run -d --name dockerbdcalendario --network red-calendario -p 5433:5432 \
  -e POSTGRES_PASSWORD=sa dockerbdcalendario

docker build -t dockerapicalendario api-calendario
docker run -d --name dockerapicalendario --network red-calendario -p 8080:8080 \
  -e BD_SERVIDOR=dockerbdcalendario -e API_FESTIVOS_URL=http://dockerapifestivos:3030 \
  dockerapicalendario
```

Con comandos sueltos hay que esperar a mano a que cada base de datos termine de cargar antes
de arrancar su API. Compose lo resuelve con los `healthcheck` y `depends_on`.

## Ejecución sin Docker

Las APIs se siguen pudiendo ejecutar en local sin cambiar nada, como en la tercera y cuarta
entrega: los pasos están en el README de la [API Calendario](api-calendario/README.md#ejecución),
que levanta los cuatro servicios en orden.

## Decisiones para revisar

Puntos que el enunciado no fija y en los que se tomó la opción más simple:

- **Script de MongoDB.** El script de la primera entrega (`BDFestivos.mjs`) usa `use
  festivos`, que solo funciona en modo interactivo, y la imagen de MongoDB solo ejecuta
  archivos `.js` o `.sh`. Por eso se trae como [bd/BDFestivos.js](api-festivos/bd/BDFestivos.js),
  con `db = db.getSiblingDB('festivos');` en lugar de `use festivos;`. Los datos son
  idénticos, y el archivo también se puede cargar en local con `mongosh api-festivos/bd/BDFestivos.js`.
- **Sin `POSTGRES_DB`.** El DDL ya hace `CREATE DATABASE calendario`. Si el contenedor también
  la creara con `POSTGRES_DB=calendario`, el script fallaría al encontrarla y la carga se
  detendría. Así los scripts de la cuarta entrega se usan sin modificar.
- **Versiones fijas.** `node:22-alpine`, `mongo:8.0`, `postgres:16`,
  `maven:3.9-eclipse-temurin-17` y `eclipse-temurin:17-jre-alpine`, en lugar de `latest`, para
  que la imagen se construya igual en cualquier momento. Para ejecutar la API Calendario se
  usa el JRE y no el JDK, porque para correr el `.jar` no hace falta el compilador.
  `openjdk:17-jdk-alpine`, la del Taller 4, ya no existe en Docker Hub.
- **`mvn` en lugar de `./mvnw` dentro de la imagen.** En Windows git puede dejar `mvnw` con fin
  de línea CRLF, y el script no correría en Linux. La imagen de Maven ya trae `mvn`. Por lo
  mismo, el [.gitattributes](.gitattributes) fuerza el fin de línea LF en los scripts que
  corren dentro de los contenedores, y el Dockerfile de PostgreSQL convierte los `.sql` a LF.
- **Pruebas unitarias fuera de la imagen.** La imagen compila con `-DskipTests` para no
  alargar la construcción. Las pruebas se corren con `./mvnw package` en `api-calendario` y
  con `npm test` en `api-festivos`.
- **Puertos de las bases de datos.** Se publican en `27018` (MongoDB) y `5433` (PostgreSQL),
  como en el `docker-compose.yml` de clase, para revisarlas desde el equipo con MongoDB
  Compass o pgAdmin. No se usan `27017` ni `5432` para no chocar con un MongoDB o un
  PostgreSQL instalados en el equipo. También se puede entrar sin puerto publicado:
  `docker exec -it dockerbdfestivos mongosh festivos` o
  `docker exec -it dockerbdcalendario psql -U postgres -d calendario`.
- **La API Calendario no exige que la API Festivos esté sana para arrancar.** Depende de su
  base de datos con `condition: service_healthy`, porque sin ella no funciona nada. De la API
  Festivos solo espera a que arranque (`service_started`): la necesita únicamente para
  generar el calendario. Si la API Festivos se cae, generar responde `false`, pero listar el
  calendario y el CRUD de tipos siguen funcionando. Es la misma decisión que se tomó en clase
  al comentar la dependencia de la API Monedas hacia la API División Política.
- **Swagger de la API Festivos sin URL fija.** El `openapi.json` tenía como servidor
  `http://localhost:3030`, así que "Try it out" solo funcionaba si el contenedor se publicaba
  en ese mismo puerto (en clase falló al publicarlo en el `3040`). Ahora el servidor es `/`:
  Swagger UI llama a la misma dirección y puerto desde los que se abrió la página. Si hiciera
  falta una URL distinta (por ejemplo, detrás de un proxy), se indica con la variable
  `URL_PUBLICA`. La API Calendario no tenía el problema: springdoc arma la URL con la de cada
  petición.
- **Reinicio y apagado.** Los cuatro servicios tienen `restart: on-failure`: si el proceso
  termina con error, Docker vuelve a levantar el contenedor. La API Festivos usa además
  `init: true`, porque Node.js, como proceso principal del contenedor, no atiende la señal de
  apagado: sin `init`, `docker compose stop` o `down` esperan 10 segundos y la terminan a la
  fuerza (código 137).
- **`healthcheck` en los cuatro servicios.** Cada base de datos queda sana cuando ya cargó
  sus scripts, y cada API cuando responde consultando su base de datos. Así
  `docker compose ps` muestra de un vistazo si todo el sistema funciona.
