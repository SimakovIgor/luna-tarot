package com.lunatarot.backend.service.donation;

import com.lunatarot.backend.domain.model.DonationEntity;
import com.lunatarot.backend.domain.repository.DonationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.telegram.telegrambots.meta.api.methods.invoices.CreateInvoiceLink;
import org.telegram.telegrambots.meta.api.objects.payments.LabeledPrice;
import org.telegram.telegrambots.meta.api.objects.payments.SuccessfulPayment;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.util.List;

/**
 * Telegram Stars donations.
 *
 * Flow:
 *   1) {@link #createDonationInvoice(long, int)} — генерим invoice link для оплаты.
 *      Mini App открывает его через {@code Telegram.WebApp.openInvoice(slug)}.
 *   2) Юзер платит → Telegram шлёт боту {@code pre_checkout_query} → подтверждаем
 *      в {@link com.lunatarot.backend.bot.UpdateRouter}.
 *   3) После списания Stars Telegram шлёт {@code successful_payment} update →
 *      {@link #recordSuccessfulPayment(long, SuccessfulPayment)} сохраняет в БД.
 */
@Slf4j
@Service
public class DonationService {

    /** Допустимые номиналы донатов в Stars (защита от произвольных сумм). */
    private static final List<Integer> ALLOWED_STAR_AMOUNTS = List.of(20, 50, 150);

    private final TelegramClient telegramClient;
    private final DonationRepository donationRepository;

    public DonationService(TelegramClient telegramClient,
                           DonationRepository donationRepository) {
        this.telegramClient = telegramClient;
        this.donationRepository = donationRepository;
    }

    /**
     * Создаёт invoice link на N Stars и возвращает строку для
     * {@code Telegram.WebApp.openInvoice(slug)}.
     */
    public String createDonationInvoice(long tgUserId, int stars) {
        if (!ALLOWED_STAR_AMOUNTS.contains(stars)) {
            throw new IllegalArgumentException(
                "Недопустимая сумма доната: " + stars + ". Разрешены: " + ALLOWED_STAR_AMOUNTS);
        }
        String payload = "donate-" + tgUserId + "-" + stars;
        CreateInvoiceLink request = CreateInvoiceLink.builder()
            .title("Поддержать Луну")
            .description(donationDescription(stars))
            .payload(payload)
            // Для Stars currency = "XTR", provider_token не нужен
            .currency("XTR")
            .prices(List.of(LabeledPrice.builder()
                .label("Звёзды")
                .amount(stars)
                .build()))
            .build();
        try {
            String link = telegramClient.execute(request);
            log.info("Created donation invoice: tgUserId={} stars={} payload={}", tgUserId, stars, payload);
            return link;
        } catch (TelegramApiException e) {
            log.error("Failed to create donation invoice: tgUserId={} stars={}", tgUserId, stars, e);
            throw new IllegalStateException("Не удалось создать инвойс. Попробуй позже.", e);
        }
    }

    /**
     * Сохраняет факт успешной оплаты. Идемпотентно — если уже сохранено по
     * {@code telegramPaymentChargeId}, второй раз не пишем.
     */
    @Transactional
    public DonationEntity recordSuccessfulPayment(long tgUserId, SuccessfulPayment payment) {
        return donationRepository.findByTelegramPaymentChargeId(payment.getTelegramPaymentChargeId())
            .orElseGet(() -> {
                DonationEntity donation = DonationEntity.builder()
                    .tgUserId(tgUserId)
                    .stars(payment.getTotalAmount())
                    .telegramPaymentChargeId(payment.getTelegramPaymentChargeId())
                    .providerPaymentChargeId(payment.getProviderPaymentChargeId())
                    .payload(payment.getInvoicePayload())
                    .build();
                DonationEntity saved = donationRepository.save(donation);
                log.info("Donation recorded: tgUserId={} stars={} payload={}",
                    tgUserId, payment.getTotalAmount(), payment.getInvoicePayload());
                return saved;
            });
    }

    /** Суммарный донат пользователя — для показа в профиле и личных уведомлениях. */
    public long totalStarsByUser(long tgUserId) {
        return donationRepository.sumStarsByTgUserId(tgUserId);
    }

    private static String donationDescription(int stars) {
        return "Свет твоих "
            + stars
            + " звёзд хранит магию Зеркала. Луна благодарна каждой искре ✦";
    }
}
