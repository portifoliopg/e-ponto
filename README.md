⏱️ E-ponto: Ponto Eletrônico PWA

O E-ponto é um Progressive Web App (PWA) simples e eficiente, desenvolvido para gerenciar o registro de ponto eletrônico de uma jornada de trabalho de 4 etapas: Entrada, Pausa (Ida), Pausa (Vinda) e Saída.

Ele foi construído com foco em acessibilidade, usabilidade em dispositivos móveis e capacidade offline, garantindo que o registro de ponto possa ser feito a qualquer momento, mesmo sem conexão à internet.

✨ Funcionalidades Principais

PWA Completo: Instalável em qualquer dispositivo (Desktop ou Mobile) para acesso rápido.

Modo Offline: Utiliza Service Worker para cache de ativos, permitindo o registro de ponto sem conectividade.

Jornada de 4 Etapas: Ciclo de ponto estruturado (Entrada, Ida, Vinda, Saída).

Registro Automático: Monitora o relógio e registra a Entrada e Saída automaticamente dentro de uma tolerância configurável (± 5 minutos) dos horários padrão.

Cronômetro de Jornada: Exibe o tempo decorrido desde a Entrada, descontando o tempo de Pausa (lógica a ser implementada).

Configurações Persistentes: Permite definir horários padrão de jornada, salvos localmente.

Visualização de Registros: Filtro de registros por dia, semana, mês e todos.

Navegação por Swipe: Permite alternar entre as telas (Ponto, Registro, Configurações) usando gestos de deslizar em dispositivos móveis.

💻 Tecnologias Utilizadas

Este projeto é um exemplo de aplicação moderna construída sem dependências externas complexas, usando apenas tecnologias web fundamentais:

HTML5: Estrutura da aplicação.

CSS3: Estilização moderna e responsiva.

Vanilla JavaScript: Toda a lógica de estado, registro, cronômetro e PWA.

Service Worker: Implementação do cache e funcionalidade offline.

localStorage: Persistência dos dados de registros e configurações.

🛠️ Como Executar Localmente

Para testar o E-ponto, especialmente as funcionalidades de Service Worker (offline), você deve executá-lo usando um servidor web local.

Pré-requisitos

Você precisará de um servidor web local simples (como o Live Server do VS Code, ou o módulo http-server do Node.js).

Passos

Estrutura de Arquivos: Crie uma pasta raiz para o projeto e salve os seguintes arquivos nela:

index.html

styles.css

script.js

manifest.json

sw.js

Crie uma subpasta chamada images e adicione os ícones PWA (icon-192.png e icon-512.png).

Inicialize o Servidor: Use seu servidor web preferido.

Com Node.js: Instale http-server globalmente (npm install -g http-server) e execute-o na pasta raiz do projeto (http-server).

Com VS Code: Use a extensão Live Server e clique em "Go Live".

Acesse: Abra o endereço do servidor no seu navegador (ex: http://127.0.0.1:8080).

Teste Offline: Após o primeiro carregamento, vá para as Ferramentas do Desenvolvedor (F12) e verifique se o Service Worker está registrado. Você pode simular o modo offline lá para confirmar a persistência.

🎯 Próximos Passos (Desenvolvimento)

O projeto está funcional, mas os seguintes recursos precisam ser adicionados para completá-lo:

Lógica da Pausa: Implementar o cálculo no script.js para subtrair o tempo entre os registros IDA (PAUSA) e VINDA (PAUSA) do tempo total da jornada no cronômetro.

Totalização Diária: Exibir o tempo total de jornada trabalhada ao final do dia (após o registro de SAÍDA).
