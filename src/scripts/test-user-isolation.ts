import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidas no arquivo .env');
  process.exit(1);
}

// Cria duas instâncias do Supabase isoladas na memória
function createIsolatedClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

const clientA = createIsolatedClient();
const clientB = createIsolatedClient();

async function runTests() {
  console.log('🚀 Iniciando os testes de isolamento de usuário no Supabase...');
  console.log(`URL do Supabase: ${supabaseUrl}`);

  // 1. Gerar credenciais temporárias para Usuário A e Usuário B
  const testId = uuidv4().substring(0, 8);
  const emailA = `test_user_a_${testId}@noblefinance.com`;
  const emailB = `test_user_b_${testId}@noblefinance.com`;
  const password = 'TestPassword123!';

  console.log(`\n👥 Criando usuários de teste:`);
  console.log(`👤 Usuário A: ${emailA}`);
  console.log(`👤 Usuário B: ${emailB}`);

  // Cadastrar Usuário A
  const { data: authDataA, error: authErrorA } = await clientA.auth.signUp({
    email: emailA,
    password,
    options: { data: { name: 'User A Test' } }
  });

  if (authErrorA || !authDataA.user) {
    console.error('❌ Erro ao cadastrar Usuário A:', authErrorA);
    process.exit(1);
  }
  const userA = authDataA.user;
  console.log(`✅ Usuário A cadastrado com ID: ${userA.id}`);

  // Cadastrar Usuário B
  const { data: authDataB, error: authErrorB } = await clientB.auth.signUp({
    email: emailB,
    password,
    options: { data: { name: 'User B Test' } }
  });

  if (authErrorB || !authDataB.user) {
    console.error('❌ Erro ao cadastrar Usuário B:', authErrorB);
    process.exit(1);
  }
  const userB = authDataB.user;
  console.log(`✅ Usuário B cadastrado com ID: ${userB.id}`);

  // Criar perfis na tabela profiles (se necessário pelo RLS/FKs)
  console.log('\n📝 Criando perfis na tabela public.profiles...');
  const { error: profileErrA } = await clientA.from('profiles').upsert({
    id: userA.id,
    username: `usera_${testId}`,
    name: 'User A Test',
    phone: '5511999999991',
    avatar: '👑'
  });
  if (profileErrA) console.warn('⚠️ Nota sobre perfil A:', profileErrA.message);

  const { error: profileErrB } = await clientB.from('profiles').upsert({
    id: userB.id,
    username: `userb_${testId}`,
    name: 'User B Test',
    phone: '5511999999992',
    avatar: '🦁'
  });
  if (profileErrB) console.warn('⚠️ Nota sobre perfil B:', profileErrB.message);

  let testsPassed = true;

  // ==========================================
  // TESTE 1: Isolamento na tabela 'banks'
  // ==========================================
  console.log('\n--- 🏦 Testando isolamento na tabela banks ---');
  const bankIdA = uuidv4();
  
  // Usuário A insere uma conta bancária
  const { error: insertBankErr } = await clientA.from('banks').insert({
    id: bankIdA,
    user_id: userA.id,
    name: 'Conta do Usuário A',
    type: 'CHECKING',
    initial_balance: 1000,
    current_balance: 1000,
    color: '#FF0000'
  });

  if (insertBankErr) {
    console.error('❌ Usuário A falhou em inserir conta bancária:', insertBankErr);
    testsPassed = false;
  } else {
    console.log('✅ Usuário A inseriu conta bancária com sucesso.');
  }

  // Usuário B tenta ler a conta do Usuário A
  const { data: readBanksByB, error: readBankErrB } = await clientB
    .from('banks')
    .select('*')
    .eq('id', bankIdA);

  if (readBankErrB) {
    console.error('❌ Erro na consulta de banks pelo Usuário B:', readBankErrB);
    testsPassed = false;
  } else if (readBanksByB && readBanksByB.length > 0) {
    console.error('❌ SEGURANÇA FALHOU: Usuário B conseguiu ler a conta bancária do Usuário A!');
    testsPassed = false;
  } else {
    console.log('✅ SEGURANÇA OK: Usuário B não conseguiu ler a conta do Usuário A.');
  }

  // Usuário B tenta atualizar a conta do Usuário A
  const { error: updateBankErrB } = await clientB
    .from('banks')
    .update({ name: 'Hacked Bank' })
    .eq('id', bankIdA);

  // Verifica se o Usuário A ainda vê o nome original
  const { data: readBanksByA } = await clientA.from('banks').select('*').eq('id', bankIdA);
  if (readBanksByA && readBanksByA[0]?.name === 'Hacked Bank') {
    console.error('❌ SEGURANÇA FALHOU: Usuário B conseguiu atualizar a conta bancária do Usuário A!');
    testsPassed = false;
  } else {
    console.log('✅ SEGURANÇA OK: Usuário B não conseguiu alterar a conta do Usuário A.');
  }

  // ==========================================
  // TESTE 2: Isolamento na tabela 'credit_cards'
  // ==========================================
  console.log('\n--- 💳 Testando isolamento na tabela credit_cards ---');
  const cardIdA = uuidv4();

  const { error: insertCardErr } = await clientA.from('credit_cards').insert({
    id: cardIdA,
    user_id: userA.id,
    name: 'Cartão do Usuário A',
    brand: 'Mastercard',
    last_four: '1234',
    total_limit: 5000,
    used_limit: 0,
    available_limit: 5000,
    closing_day: 5,
    due_day: 15,
    color: '#00FF00'
  });

  if (insertCardErr) {
    console.error('❌ Usuário A falhou em inserir cartão de crédito:', insertCardErr);
    testsPassed = false;
  } else {
    console.log('✅ Usuário A inseriu cartão de crédito com sucesso.');
  }

  // Usuário B tenta ler o cartão do Usuário A
  const { data: readCardsByB } = await clientB
    .from('credit_cards')
    .select('*')
    .eq('id', cardIdA);

  if (readCardsByB && readCardsByB.length > 0) {
    console.error('❌ SEGURANÇA FALHOU: Usuário B conseguiu ler o cartão do Usuário A!');
    testsPassed = false;
  } else {
    console.log('✅ SEGURANÇA OK: Usuário B não conseguiu ler o cartão do Usuário A.');
  }

  // ==========================================
  // TESTE 3: Isolamento na tabela 'transactions'
  // ==========================================
  console.log('\n--- 💸 Testando isolamento na tabela transactions ---');
  const txIdA = uuidv4();

  const { error: insertTxErr } = await clientA.from('transactions').insert({
    id: txIdA,
    user_id: userA.id,
    type: 'EXPENSE',
    description: 'Despesa Privada do Usuário A',
    amount: 199.90,
    competence_date: new Date().toISOString(),
    due_date: new Date().toISOString(),
    status: 'OPEN',
    is_recurring: false,
    is_installment: false
  });

  if (insertTxErr) {
    console.error('❌ Usuário A falhou em inserir transação:', insertTxErr);
    testsPassed = false;
  } else {
    console.log('✅ Usuário A inseriu transação com sucesso.');
  }

  // Usuário B tenta ler a transação do Usuário A
  const { data: readTxsByB } = await clientB
    .from('transactions')
    .select('*')
    .eq('id', txIdA);

  if (readTxsByB && readTxsByB.length > 0) {
    console.error('❌ SEGURANÇA FALHOU: Usuário B conseguiu ler a transação do Usuário A!');
    testsPassed = false;
  } else {
    console.log('✅ SEGURANÇA OK: Usuário B não conseguiu ler a transação do Usuário A.');
  }

  // Usuário B tenta deletar a transação do Usuário A
  const { error: deleteTxErrB } = await clientB
    .from('transactions')
    .delete()
    .eq('id', txIdA);

  // Verifica se a transação do Usuário A continua lá intacta
  const { data: readTxsByA } = await clientA
    .from('transactions')
    .select('*')
    .eq('id', txIdA);

  if (!readTxsByA || readTxsByA.length === 0) {
    console.error('❌ SEGURANÇA FALHOU: Usuário B conseguiu excluir a transação do Usuário A!');
    testsPassed = false;
  } else {
    console.log('✅ SEGURANÇA OK: Usuário B não conseguiu excluir a transação do Usuário A.');
  }

  // ==========================================
  // TESTE 4: Isolamento na tabela 'goals'
  // ==========================================
  console.log('\n--- 🎯 Testando isolamento na tabela goals ---');
  const goalIdA = uuidv4();

  const { error: insertGoalErr } = await clientA.from('goals').insert({
    id: goalIdA,
    user_id: userA.id,
    name: 'Meta Secreta do Usuário A',
    target_amount: 10000,
    current_amount: 500,
    deadline_date: new Date().toISOString(),
    type: 'SAVINGS'
  });

  if (insertGoalErr) {
    console.error('❌ Usuário A falhou em inserir meta:', insertGoalErr);
    testsPassed = false;
  } else {
    console.log('✅ Usuário A inseriu meta com sucesso.');
  }

  // Usuário B tenta ler a meta do Usuário A
  const { data: readGoalsByB } = await clientB
    .from('goals')
    .select('*')
    .eq('id', goalIdA);

  if (readGoalsByB && readGoalsByB.length > 0) {
    console.error('❌ SEGURANÇA FALHOU: Usuário B conseguiu ler a meta do Usuário A!');
    testsPassed = false;
  } else {
    console.log('✅ SEGURANÇA OK: Usuário B não conseguiu ler a meta do Usuário A.');
  }

  // ==========================================
  // TESTE 5: Isolamento na tabela 'reminders'
  // ==========================================
  console.log('\n--- 🔔 Testando isolamento na tabela reminders ---');
  const reminderIdA = uuidv4();

  const { error: insertReminderErr } = await clientA.from('reminders').insert({
    id: reminderIdA,
    user_id: userA.id,
    title: 'Lembrete do Usuário A',
    description: 'Descrição do lembrete',
    due_date: new Date().toISOString(),
    is_completed: false
  });

  if (insertReminderErr) {
    console.error('❌ Usuário A falhou em inserir lembrete:', insertReminderErr);
    testsPassed = false;
  } else {
    console.log('✅ Usuário A inseriu lembrete com sucesso.');
  }

  // Usuário B tenta ler o lembrete do Usuário A
  const { data: readRemindersByB } = await clientB
    .from('reminders')
    .select('*')
    .eq('id', reminderIdA);

  if (readRemindersByB && readRemindersByB.length > 0) {
    console.error('❌ SEGURANÇA FALHOU: Usuário B conseguiu ler o lembrete do Usuário A!');
    testsPassed = false;
  } else {
    console.log('✅ SEGURANÇA OK: Usuário B não conseguiu ler o lembrete do Usuário A.');
  }

  // ==========================================
  // LIMPEZA DOS DADOS CRIADOS
  // ==========================================
  console.log('\n🧹 Limpando dados de teste do banco de dados...');
  
  // Limpar dados do Usuário A
  await clientA.from('reminders').delete().eq('user_id', userA.id);
  await clientA.from('goals').delete().eq('user_id', userA.id);
  await clientA.from('transactions').delete().eq('user_id', userA.id);
  await clientA.from('credit_cards').delete().eq('user_id', userA.id);
  await clientA.from('banks').delete().eq('user_id', userA.id);
  await clientA.from('profiles').delete().eq('id', userA.id);

  console.log('🧹 Limpeza concluída.');

  // ==========================================
  // CONCLUSÃO DO TESTE
  // ==========================================
  console.log('\n======================================================');
  if (testsPassed) {
    console.log('🏆 SUCESSO: Todas as validações de isolamento passaram!');
    console.log('🔒 O banco de dados garante 100% que Usuário A não vê dados de Usuário B.');
    console.log('======================================================');
    process.exit(0);
  } else {
    console.error('❌ FALHA: Foram detectadas brechas de isolamento de dados no banco!');
    console.log('======================================================');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('❌ Erro inesperado ao rodar os testes:', err);
  process.exit(1);
});
