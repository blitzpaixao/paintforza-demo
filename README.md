# Paint Forza — demonstração do site e do sistema da oficina

Protótipo funcional para apresentar à Paint Forza (funilaria, pintura e estética automotiva, Belém – PA).
Não precisa de instalação: é HTML, CSS e JavaScript puro, e os dados de exemplo ficam salvos no navegador.

## Online

- Site: https://paintforza-demo.vercel.app/
- Sistema da oficina: https://paintforza-demo.vercel.app/sistema.html
- Portal do cliente: https://paintforza-demo.vercel.app/acompanhar.html?os=1042&c=FZ7K

O site está marcado para não aparecer no Google (noindex) enquanto não for aprovado.
Para atualizar a versão online, faça commit e `git push`: a Vercel publica sozinha em poucos segundos.

## Como abrir no computador

```bash
python servidor.py
```

O navegador abre em `http://localhost:5500`. (Também dá para publicar a pasta inteira em qualquer hospedagem estática, como Netlify ou Vercel.)

## O que tem

| Página | Para quem | O que faz |
|---|---|---|
| `index.html` | Público | Site institucional: serviços, trabalhos reais, como funciona, equipe, WhatsApp e acompanhamento da OS |
| `sistema.html` | Oficina | Sistema de gestão (botão **Entrar na demonstração**) |
| `acompanhar.html` | Cliente | Link que o cliente recebe no WhatsApp: etapa atual, aprovação do orçamento item a item, fotos de cada etapa, antes e depois, valores (com franquia, se for seguradora) e documentos em PDF |

### Sistema da oficina
- **Painel**: carros no pátio, aprovações pendentes, prontos para retirada, recebido no mês, a receber, agenda do dia, alerta de estoque baixo e **pós-venda** (pedir avaliação, lembrar manutenção da vitrificação, oferecer de novo o que o cliente recusou).
- **Pátio**: quadro com uma coluna por etapa. Arraste o cartão para mudar a etapa.
- **Agenda**: semana com orçamentos, entradas e retiradas marcadas, mais as entregas previstas das OS. Confirma o horário pelo WhatsApp e abre a OS a partir do agendamento.
- **Ordem de serviço** com:
  - **Vistoria de entrada**: desenho do carro para marcar avarias por peça, km, combustível, itens no carro, fotos e assinatura do cliente na tela.
  - **Serviços e valores**: orçamento com tabela de preços, **aprovação item a item** e **quem executa** cada serviço.
  - **Seguradora**: sinistro, franquia paga pelo cliente, parte da seguradora e situação da autorização. O financeiro separa quem deve o quê.
  - **Saída**: checklist de qualidade, fotos do carro pronto, assinatura de retirada e **antes e depois** automático.
  - **Financeiro da OS**: pagamentos, custos (lançados ou **tirados do estoque**) e margem daquele carro.
  - **Histórico** com **fotos de cada etapa** (funilaria, preparação, pintura…).
- **Documentos em PDF com a marca**: orçamento (com QR Code para aprovar), laudo de vistoria, recibo (com valor por extenso), certificado de garantia, termo de entrega e lista de compras. Baixa o PDF ou envia no WhatsApp (no celular abre o compartilhamento direto).
- **Estoque**: tintas, vernizes, abrasivos, películas, EPIs e peças, com mínimo, custo médio, entradas (que podem virar despesa), saídas ligadas à OS (que viram custo do carro), ajuste de contagem e lista de compras em PDF.
- **Veículos** e **Clientes**: histórico e financeiro de cada carro e de cada cliente.
- **Financeiro**: visão geral (inclui a receber de seguradoras), resultado por veículo, lançamentos, despesas da oficina e **equipe e comissões**.
- **Ajustes**: dados da oficina, tabela de preços, equipe com % de comissão e prazos de garantia.

### Para testar na apresentação
- Portal do cliente: OS **1042**, código **FZ7K** (carro em pintura).
- Aprovação de orçamento: OS **1043**, código **RP2B**. Abra o sistema em outra aba e veja a OS mudar de etapa sozinha quando o cliente aprova.
- Seguradora: OS **1036** (Azul Seguros, autorizado) e **1043** (Porto Seguro, aguardando).
- PDFs: abra qualquer OS e use **Documentos em PDF**.
- **Ajustes > Restaurar dados de exemplo** volta tudo ao estado inicial.
- Se o navegador mostrar a versão antiga, recarregue com **Ctrl + F5**.

## Fotos
- `assets/img/trabalhos/`: fotos reais do Instagram @forza.paint (galeria e equipe). Vieram em baixa resolução (360 px), então aparecem só em tamanho pequeno. Peça à empresa os arquivos originais para usar em destaque.
- O carro do topo (Audi S3 sedã 8V, Pexels) e as fotos dos blocos de serviço (Unsplash) são de bancos de imagens gratuitos, carregadas da internet. Trocar pelas fotos da própria oficina quando houver.

## O que falta para virar produto
- Servidor e banco de dados (hoje cada navegador tem a sua cópia dos dados), login com senha por funcionário.
- Fotos guardadas em nuvem (o navegador comporta poucas fotos).
- Envio automático de WhatsApp (API oficial) e cobrança por Pix com QR Code.
- Prazos de garantia, condições do orçamento e percentuais de comissão reais da oficina.
- Emissão de nota fiscal de serviço (NFS-e) e integração com seguradoras.
- Endereço, horário e tabela de preços reais da Paint Forza (os atuais são exemplos).
