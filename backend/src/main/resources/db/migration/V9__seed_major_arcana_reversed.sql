-- Перевёрнутые смыслы 22 старших арканов.
-- Перевёрнутая карта = тень / искажение / блокировка прямого смысла.

UPDATE tarot_cards SET reversed_meaning =
    'Безрассудство, наивный риск, отказ учитывать прошлый опыт. Стоит притормозить — не каждый шаг в неизвестное благословлён.'
    WHERE arcana = 'MAJOR' AND numeral = 0;

UPDATE tarot_cards SET reversed_meaning =
    'Манипуляция собой или другими, неиспользованный потенциал. Сила есть — но направлена не туда. Спроси, чьим целям ты служишь.'
    WHERE arcana = 'MAJOR' AND numeral = 1;

UPDATE tarot_cards SET reversed_meaning =
    'Подавленная интуиция, секреты, отчуждение от своего внутреннего голоса. Чужие мнения заглушают твой.'
    WHERE arcana = 'MAJOR' AND numeral = 2;

UPDATE tarot_cards SET reversed_meaning =
    'Эмоциональная зависимость, бесплодные усилия, забота, превращённая в контроль. Дай близкому пространство — и себе тоже.'
    WHERE arcana = 'MAJOR' AND numeral = 3;

UPDATE tarot_cards SET reversed_meaning =
    'Тирания, жёсткость, отрицание чувств ради порядка. Сила без сердца ломает то, что должна защищать.'
    WHERE arcana = 'MAJOR' AND numeral = 4;

UPDATE tarot_cards SET reversed_meaning =
    'Догматизм или, наоборот, бунт против любой системы. Где-то ты застрял(а) — слепо следуешь или слепо отрицаешь. Найди свою опору.'
    WHERE arcana = 'MAJOR' AND numeral = 5;

UPDATE tarot_cards SET reversed_meaning =
    'Разлад в отношениях, неравный союз, выбор из страха, а не из любви. Карта зовёт к честному разговору с собой.'
    WHERE arcana = 'MAJOR' AND numeral = 6;

UPDATE tarot_cards SET reversed_meaning =
    'Потеря направления, рассеянная воля, гонка не за тем. Останови колесницу — куда ты на самом деле едешь?'
    WHERE arcana = 'MAJOR' AND numeral = 7;

UPDATE tarot_cards SET reversed_meaning =
    'Внутренний страх берёт верх, агрессия как защита, неверие в собственную мягкость. Сила прячется — но она ещё с тобой.'
    WHERE arcana = 'MAJOR' AND numeral = 8;

UPDATE tarot_cards SET reversed_meaning =
    'Одиночество без выбора, изоляция, страх вернуться к людям. Уединение перестало лечить — пора выйти из пещеры.'
    WHERE arcana = 'MAJOR' AND numeral = 9;

UPDATE tarot_cards SET reversed_meaning =
    'Сопротивление переменам, ощущение, что удача отвернулась. Колесо крутится — не цепляйся за то, что уже уходит.'
    WHERE arcana = 'MAJOR' AND numeral = 10;

UPDATE tarot_cards SET reversed_meaning =
    'Несправедливость, увиливание от ответственности, нечестность в свою пользу. Весы качнулись — рано или поздно вернётся равновесие.'
    WHERE arcana = 'MAJOR' AND numeral = 11;

UPDATE tarot_cards SET reversed_meaning =
    'Затягивание паузы, бессмысленные жертвы, ожидание, ставшее ловушкой. Висение перестало быть откровением — пора освободиться.'
    WHERE arcana = 'MAJOR' AND numeral = 12;

UPDATE tarot_cards SET reversed_meaning =
    'Страх перемен, цепляние за отжившее, отказ хоронить мёртвое. Перерождение задерживается, потому что ты держишь его за хвост.'
    WHERE arcana = 'MAJOR' AND numeral = 13;

UPDATE tarot_cards SET reversed_meaning =
    'Дисбаланс, излишество в одну сторону, нетерпение в смешивании. Карта зовёт к мягкости и неспешности.'
    WHERE arcana = 'MAJOR' AND numeral = 14;

UPDATE tarot_cards SET reversed_meaning =
    'Освобождение от цепей, разрыв зависимости, прозрение своей тени. То, что казалось властью над тобой, теряет силу.'
    WHERE arcana = 'MAJOR' AND numeral = 15;

UPDATE tarot_cards SET reversed_meaning =
    'Страх перемен, попытка укрепить то, что обречено рухнуть. Чем дольше держишь — тем больнее упадёт. Лучше отпустить.'
    WHERE arcana = 'MAJOR' AND numeral = 16;

UPDATE tarot_cards SET reversed_meaning =
    'Разочарование, потеря веры, ощущение пустого неба. Звезда не погасла — это ты отвернулся(-ась). Подними взгляд.'
    WHERE arcana = 'MAJOR' AND numeral = 17;

UPDATE tarot_cards SET reversed_meaning =
    'Туман рассеивается, тайны раскрываются, страхи отпускают. Карта обещает ясность после долгой неопределённости.'
    WHERE arcana = 'MAJOR' AND numeral = 18;

UPDATE tarot_cards SET reversed_meaning =
    'Временные неудачи, неуверенность, усталость от собственного блеска. Солнце за тучами — но оно по-прежнему светит.'
    WHERE arcana = 'MAJOR' AND numeral = 19;

UPDATE tarot_cards SET reversed_meaning =
    'Сомнения в себе, страх отклика, отказ услышать собственный зов. Что-то в тебе просит обновления — не заглушай.'
    WHERE arcana = 'MAJOR' AND numeral = 20;

UPDATE tarot_cards SET reversed_meaning =
    'Цикл не закрыт, незавершённые дела тянут назад. Что-то требует поставить точку — иначе новое не начнётся.'
    WHERE arcana = 'MAJOR' AND numeral = 21;
