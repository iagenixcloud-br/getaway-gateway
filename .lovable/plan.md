## Ajuste no seed-test-leads

Trocar o nome fixo `Teste Seed #001` por nomes brasileiros realistas, mantendo um marcador discreto para facilitar a limpeza depois.

### Mudança em `supabase/functions/seed-test-leads/index.ts`

1. Adicionar dois arrays no topo:
   ```ts
   const FIRST_NAMES = [
     "Ana","Bruno","Carla","Daniel","Eduarda","Felipe","Gabriela","Henrique",
     "Isabela","João","Karina","Lucas","Mariana","Nicolas","Olívia","Pedro",
     "Queila","Rafael","Sofia","Thiago","Úrsula","Vinícius","Wesley","Yasmin",
     "Beatriz","Caio","Débora","Otávio","Renata","Sérgio"
   ];
   const LAST_NAMES = [
     "Silva","Souza","Oliveira","Santos","Pereira","Lima","Costa","Almeida",
     "Ferreira","Rodrigues","Gomes","Martins","Araújo","Ribeiro","Carvalho",
     "Barbosa","Mendes","Cardoso","Teixeira","Moreira","Nascimento","Cavalcanti"
   ];
   ```

2. Dentro do `Array.from(...)`, substituir:
   ```ts
   name: `Teste Seed #${idx}`,
   ```
   por:
   ```ts
   const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
   const last  = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
   const name  = `${first} ${last}`;
   ```
   e usar `name,` no objeto.

### O que NÃO muda

- Telefones, e-mails, cidades, interesses, budget, `origem: 'seed_teste'`, distribuição round-robin: tudo igual.
- A limpeza continua simples: `DELETE FROM leads WHERE origem = 'seed_teste'` (o marcador continua no campo `origem`, não no nome).

Posso aplicar?
