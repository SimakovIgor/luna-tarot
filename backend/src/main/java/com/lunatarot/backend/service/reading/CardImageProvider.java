package com.lunatarot.backend.service.reading;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.awt.geom.AffineTransform;
import java.awt.image.AffineTransformOp;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import javax.imageio.ImageIO;

/**
 * Отдаёт изображение карты из {@code classpath:/cards/}. Имя файла лежит
 * в колонке {@code tarot_cards.image_path}.
 *
 * Если карта выпала перевёрнутой — изображение разворачивается на 180° на лету
 * через {@link BufferedImage}.
 */
@Component
public class CardImageProvider {

    private static final String CARDS_DIR = "cards/";
    private static final String IMG_FORMAT = "jpg";

    public Resource resourceFor(String imagePath) {
        if (imagePath == null || imagePath.isBlank()) {
            throw new IllegalArgumentException("imagePath must not be blank");
        }
        return new ClassPathResource(CARDS_DIR + imagePath);
    }

    public InputStream inputStreamFor(String imagePath, boolean reversed) throws IOException {
        Resource res = resourceFor(imagePath);
        if (!reversed) {
            return res.getInputStream();
        }
        return rotate180(res.getInputStream());
    }

    private static InputStream rotate180(InputStream source) throws IOException {
        try (InputStream in = source) {
            BufferedImage original = ImageIO.read(in);
            if (original == null) {
                throw new IOException("Failed to decode image");
            }
            AffineTransform tx = AffineTransform.getRotateInstance(
                Math.PI, original.getWidth() / 2.0, original.getHeight() / 2.0
            );
            AffineTransformOp op = new AffineTransformOp(tx, AffineTransformOp.TYPE_BILINEAR);
            BufferedImage rotated = op.filter(original, null);

            ByteArrayOutputStream baos = new ByteArrayOutputStream(64 * 1024);
            ImageIO.write(rotated, IMG_FORMAT, baos);
            return new ByteArrayInputStream(baos.toByteArray());
        }
    }
}
