package com.lunatarot.backend.api.controller;

import com.lunatarot.backend.api.auth.AuthFilter;
import com.lunatarot.backend.service.donation.DonationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Эндпоинт для генерации Telegram Stars invoice'а.
 * Mini App вызывает {@code POST /api/donate/invoice} с суммой → получает slug,
 * который скармливает в {@code Telegram.WebApp.openInvoice(slug)}.
 */
@RestController
@RequestMapping("/api/donate")
public class DonationController {

    private final DonationService donationService;

    public DonationController(DonationService donationService) {
        this.donationService = donationService;
    }

    @PostMapping("/invoice")
    public InvoiceResponse createInvoice(@Valid @RequestBody InvoiceRequest request,
                                         HttpServletRequest http) {
        long tgUserId = (Long) http.getAttribute(AuthFilter.ATTR_TG_USER_ID);
        String slug = donationService.createDonationInvoice(tgUserId, request.stars());
        return new InvoiceResponse(slug);
    }

    public record InvoiceRequest(@NotNull @Min(1) Integer stars) {
    }

    public record InvoiceResponse(String slug) {
    }
}
