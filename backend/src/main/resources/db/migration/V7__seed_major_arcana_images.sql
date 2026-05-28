-- Привязываем classpath-имена JPG'шек к старшим арканам.
-- Изображения лежат в backend/src/main/resources/cards/ и попадают внутрь JAR.
-- Маппинг: numeral N → m{NN}.jpg (с ведущим нулём для N < 10).

UPDATE tarot_cards SET image_path = 'm00.jpg' WHERE arcana = 'MAJOR' AND numeral = 0;
UPDATE tarot_cards SET image_path = 'm01.jpg' WHERE arcana = 'MAJOR' AND numeral = 1;
UPDATE tarot_cards SET image_path = 'm02.jpg' WHERE arcana = 'MAJOR' AND numeral = 2;
UPDATE tarot_cards SET image_path = 'm03.jpg' WHERE arcana = 'MAJOR' AND numeral = 3;
UPDATE tarot_cards SET image_path = 'm04.jpg' WHERE arcana = 'MAJOR' AND numeral = 4;
UPDATE tarot_cards SET image_path = 'm05.jpg' WHERE arcana = 'MAJOR' AND numeral = 5;
UPDATE tarot_cards SET image_path = 'm06.jpg' WHERE arcana = 'MAJOR' AND numeral = 6;
UPDATE tarot_cards SET image_path = 'm07.jpg' WHERE arcana = 'MAJOR' AND numeral = 7;
UPDATE tarot_cards SET image_path = 'm08.jpg' WHERE arcana = 'MAJOR' AND numeral = 8;
UPDATE tarot_cards SET image_path = 'm09.jpg' WHERE arcana = 'MAJOR' AND numeral = 9;
UPDATE tarot_cards SET image_path = 'm10.jpg' WHERE arcana = 'MAJOR' AND numeral = 10;
UPDATE tarot_cards SET image_path = 'm11.jpg' WHERE arcana = 'MAJOR' AND numeral = 11;
UPDATE tarot_cards SET image_path = 'm12.jpg' WHERE arcana = 'MAJOR' AND numeral = 12;
UPDATE tarot_cards SET image_path = 'm13.jpg' WHERE arcana = 'MAJOR' AND numeral = 13;
UPDATE tarot_cards SET image_path = 'm14.jpg' WHERE arcana = 'MAJOR' AND numeral = 14;
UPDATE tarot_cards SET image_path = 'm15.jpg' WHERE arcana = 'MAJOR' AND numeral = 15;
UPDATE tarot_cards SET image_path = 'm16.jpg' WHERE arcana = 'MAJOR' AND numeral = 16;
UPDATE tarot_cards SET image_path = 'm17.jpg' WHERE arcana = 'MAJOR' AND numeral = 17;
UPDATE tarot_cards SET image_path = 'm18.jpg' WHERE arcana = 'MAJOR' AND numeral = 18;
UPDATE tarot_cards SET image_path = 'm19.jpg' WHERE arcana = 'MAJOR' AND numeral = 19;
UPDATE tarot_cards SET image_path = 'm20.jpg' WHERE arcana = 'MAJOR' AND numeral = 20;
UPDATE tarot_cards SET image_path = 'm21.jpg' WHERE arcana = 'MAJOR' AND numeral = 21;
