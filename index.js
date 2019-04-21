const clear = require('clear');
const readlineSync = require('readline-sync');

const quiz = require('./quiz');

const stages = {
  ANSWER_QUESTION: 1,
  FINISHED: 2,
};

const state = {
  stage: stages.ANSWER_QUESTION,
  quiz: null,
  index: 0,
  answers: { right: 0, wrong: 0 },
};

function shuffle(array) {
  let currentIndex = array.length;
  let temporaryValue;
  let randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    // eslint-disable-next-line
    array[currentIndex] = array[randomIndex];
    // eslint-disable-next-line
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function randomizeQuiz(quizToRand) {
  const { questions: oldQuestions, answers: oldAnswers } = quizToRand;

  return shuffle([...new Array(oldQuestions.length)].map((_, i) => i)).reduce(
    ({ questions, answers }, questionIndex) => {
      const question = oldQuestions[questionIndex];
      const oldAnswer = oldAnswers[questionIndex];

      if (oldAnswer <= 0) {
        return {
          questions: [...questions, { text: question.text, choices: shuffle(question.choices) }],
          answers: [...answers, -1],
        };
      }
      const choiceIndexes = shuffle([...new Array(question.choices.length)].map((_, i) => i));
      const newAnswerIndex = choiceIndexes.indexOf(oldAnswers[questionIndex] - 1) + 1;

      return {
        questions: [
          ...questions,
          { text: question.text, choices: choiceIndexes.map(i => question.choices[i]) },
        ],
        answers: [...answers, newAnswerIndex],
      };
    },
    { questions: [], answers: [] },
  );
}

function resetState() {
  state.stage = stages.ANSWER_QUESTION;
  state.quiz = randomizeQuiz(JSON.parse(JSON.stringify(quiz)));
  state.index = 0;
  state.answers.right = 0;
  state.answers.wrong = 0;
}

// go to next question
function next() {
  state.index += 1;
  if (state.index >= state.quiz.questions.length) {
    state.stage = stages.FINISHED;
  }
}

const alph = 'ABCDEFGH';
function userAnswerToIndex(str) {
  return alph.indexOf(str.trim().toUpperCase()[0]) + 1;
}

function answerFunc(userAnswerStr) {
  if (state.stage !== stages.ANSWER_QUESTION) throw new Error('su an cevap komutu calismaz!');
  const answer = state.quiz.answers[state.index];
  const userAnswer = userAnswerToIndex(userAnswerStr);

  if (answer === -1) {
    state.flash = 'Cevap Bilinmiyor!';
    return next();
  }

  const isTrue = userAnswer === answer;
  state.answers[isTrue ? 'right' : 'wrong'] += 1;
  state.flash = isTrue ? 'Doğru cevap!' : 'Yanlış Cevap!';
  return next();
}

function exitFunc() {
  process.exit(0);
}

const Commands = {
  Answer: { cmd: 'p', func: answerFunc },
  Skip: { cmd: 's', func: next },
  Exit: { cmd: 'e', func: exitFunc },
  Reset: { cmd: 'r', func: resetState },
};

function getStatusText() {
  const { right, wrong } = state.answers;
  return `+${right}/-${wrong}/?${state.index - (right + wrong)}`;
}

function renderAnswerStage() {
  const question = state.quiz.questions[state.index];
  console.log('Soru:', question.text);
  question.choices.forEach((choice, idx) => {
    console.log(`${alph[idx]}-) ${choice}`);
  });
  console.log('-------');
  console.log('Durum:', getStatusText());
  console.log('-------');
}

function renderFinishStage() {
  console.log(`Sonuç: ${getStatusText()}`);
}

function render() {
  console.log(`--------${state.flash ? state.flash : ''}------------`);

  if (state.stage === stages.ANSWER_QUESTION) {
    renderAnswerStage();
  } else if (state.stage === stages.FINISHED) {
    renderFinishStage();
  }

  state.flash = '';
}

function parseAndRunCommand(str) {
  const command = Object.values(Commands).find(({ cmd }) => str.startsWith(cmd));
  if (!command) throw new Error('command not found');
  const args = str.substring(command.cmd.length + 1).split(' ');

  command.func.apply(this, args);
  state.flash = `${command.cmd} ran`;
}

resetState();
while (true) {
  try {
    clear();
    render();

    const line = readlineSync.question('command: ');
    parseAndRunCommand(line);
  } catch (err) {
    state.flash = err.message;
  }
}
