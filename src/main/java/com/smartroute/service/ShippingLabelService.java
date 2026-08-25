package com.smartroute.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.smartroute.domain.entity.Order;
import com.smartroute.domain.entity.OrderAllocation;
import com.smartroute.domain.entity.OrderLine;
import com.smartroute.repository.OrderAllocationRepository;
import com.smartroute.repository.OrderRepository;
import com.smartroute.web.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class ShippingLabelService {

    private final OrderRepository orderRepository;
    private final OrderAllocationRepository allocationRepository;
    private final ShippingCarrierService carrierService;

    public ShippingLabelService(OrderRepository orderRepository,
                                OrderAllocationRepository allocationRepository,
                                ShippingCarrierService carrierService) {
        this.orderRepository = orderRepository;
        this.allocationRepository = allocationRepository;
        this.carrierService = carrierService;
    }

    /**
     * Generates a 4x6 inch thermal shipping label PDF with Code-128 vector barcode.
     */
    @Transactional(readOnly = true)
    public byte[] generateAllocationLabel(UUID orderId, UUID allocationId) throws Exception {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order", orderId));

        OrderAllocation allocation = allocationRepository.findById(allocationId)
                .orElseThrow(() -> new EntityNotFoundException("Allocation", allocationId));

        return buildLabelPdf(order, allocation);
    }

    /**
     * Generates shipping label for the first allocation in the order (or combined).
     */
    @Transactional(readOnly = true)
    public byte[] generateOrderLabel(UUID orderId) throws Exception {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order", orderId));

        if (order.getOrderLines().isEmpty() || order.getOrderLines().get(0).getAllocations().isEmpty()) {
            throw new IllegalArgumentException("Order has no routed allocations yet.");
        }

        OrderAllocation firstAllocation = order.getOrderLines().get(0).getAllocations().get(0);
        return buildLabelPdf(order, firstAllocation);
    }

    private byte[] buildLabelPdf(Order order, OrderAllocation allocation) throws Exception {
        // Standard 4x6 inch page (288 x 432 pt) with 15pt margins
        Rectangle labelSize = new Rectangle(288, 432);
        Document document = new Document(labelSize, 14, 14, 14, 14);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        PdfWriter writer = PdfWriter.getInstance(document, out);
        document.open();

        PdfContentByte cb = writer.getDirectContent();

        // Fonts
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.BLACK);
        Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.BLACK);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 6.5f, Color.DARK_GRAY);

        // Header table: Carrier & Service Type
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{65, 35});

        // Determine carrier name
        String carrierName = "STRIDE EXPRESS / FEDEX PRIORITY";
        if (allocation.getScoreBreakdown() != null && allocation.getScoreBreakdown().contains("USPS")) {
            carrierName = "USPS PRIORITY MAIL 2-DAY";
        } else if (allocation.getScoreBreakdown() != null && allocation.getScoreBreakdown().contains("UPS")) {
            carrierName = "UPS GROUND COMMERCIAL";
        }

        PdfPCell carrierCell = new PdfPCell(new Phrase(carrierName, titleFont));
        carrierCell.setBorder(Rectangle.BOTTOM);
        carrierCell.setBorderWidth(2f);
        carrierCell.setPaddingBottom(6f);
        headerTable.addCell(carrierCell);

        PdfPCell classCell = new PdfPCell(new Phrase("ZONE 4 / EXP\nTRACKED", subTitleFont));
        classCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        classCell.setBorder(Rectangle.BOTTOM);
        classCell.setBorderWidth(2f);
        classCell.setPaddingBottom(6f);
        headerTable.addCell(classCell);

        document.add(headerTable);

        // Ship From (Origin Node)
        PdfPTable shipFromTable = new PdfPTable(1);
        shipFromTable.setWidthPercentage(100);
        shipFromTable.setSpacingBefore(6f);

        String warehouseName = allocation.getWarehouse() != null ? allocation.getWarehouse().getName() : "Central Hub";
        String warehouseAddress = allocation.getWarehouse() != null ? allocation.getWarehouse().getAddress() : "1000 Westgate Dr, Chicago, IL 60607";

        PdfPCell shipFromCell = new PdfPCell();
        shipFromCell.setBorder(Rectangle.NO_BORDER);
        shipFromCell.addElement(new Phrase("SHIP FROM:", boldFont));
        shipFromCell.addElement(new Phrase("STRIDE Fulfillment Node: " + warehouseName, normalFont));
        shipFromCell.addElement(new Phrase(warehouseAddress, normalFont));
        shipFromTable.addCell(shipFromCell);
        document.add(shipFromTable);

        // Separator line
        PdfPTable sep = new PdfPTable(1);
        sep.setWidthPercentage(100);
        sep.setSpacingBefore(4f);
        sep.setSpacingAfter(4f);
        PdfPCell sepCell = new PdfPCell();
        sepCell.setBorder(Rectangle.BOTTOM);
        sepCell.setBorderWidth(1f);
        sepCell.setFixedHeight(2f);
        sep.addCell(sepCell);
        document.add(sep);

        // Ship To (Customer Destination)
        PdfPTable shipToTable = new PdfPTable(1);
        shipToTable.setWidthPercentage(100);

        String customerName = order.getCustomer() != null ? order.getCustomer().getName() : "Valued Customer";
        String customerAddress = order.getCustomer() != null && order.getCustomer().getAddress() != null
                ? order.getCustomer().getAddress() : "742 Evergreen Terrace, Springfield, OR";
        String customerEmail = order.getCustomer() != null && order.getCustomer().getEmail() != null
                ? order.getCustomer().getEmail() : "customer@stride.io";

        PdfPCell shipToCell = new PdfPCell();
        shipToCell.setBorder(Rectangle.NO_BORDER);
        shipToCell.addElement(new Phrase("SHIP TO:", boldFont));
        shipToCell.addElement(new Phrase(customerName.toUpperCase(), titleFont));
        shipToCell.addElement(new Phrase(customerAddress, normalFont));
        shipToCell.addElement(new Phrase("Contact: " + customerEmail, normalFont));
        shipToTable.addCell(shipToCell);
        document.add(shipToTable);

        // Barcode Generation (Code-128)
        String trackingNumber = "STR-" + allocation.getId().toString().substring(0, 8).toUpperCase()
                + "-" + order.getId().toString().substring(0, 4).toUpperCase();

        Barcode128 barcode = new Barcode128();
        barcode.setCode(trackingNumber);
        barcode.setCodeType(Barcode128.CODE128);
        barcode.setBarHeight(45f);
        barcode.setX(1.1f);
        barcode.setAltText(trackingNumber);
        barcode.setSize(9f);

        Image barcodeImage = barcode.createImageWithBarcode(cb, Color.BLACK, Color.BLACK);
        barcodeImage.setAlignment(Element.ALIGN_CENTER);
        barcodeImage.setSpacingBefore(12f);
        barcodeImage.setSpacingAfter(10f);
        document.add(barcodeImage);

        // Manifest Summary
        OrderLine line = allocation.getOrderLine();
        String productName = line != null && line.getProduct() != null ? line.getProduct().getName() : "Item Package";
        String sku = line != null && line.getProduct() != null ? line.getProduct().getSku() : "SKU-AUTO";

        PdfPTable manifestTable = new PdfPTable(3);
        manifestTable.setWidthPercentage(100);
        manifestTable.setWidths(new float[]{50, 30, 20});
        manifestTable.setSpacingBefore(6f);

        PdfPCell mHeader1 = new PdfPCell(new Phrase("ITEM / DESC", boldFont));
        PdfPCell mHeader2 = new PdfPCell(new Phrase("SKU", boldFont));
        PdfPCell mHeader3 = new PdfPCell(new Phrase("QTY", boldFont));
        mHeader1.setBackgroundColor(new Color(240, 240, 240));
        mHeader2.setBackgroundColor(new Color(240, 240, 240));
        mHeader3.setBackgroundColor(new Color(240, 240, 240));
        manifestTable.addCell(mHeader1);
        manifestTable.addCell(mHeader2);
        manifestTable.addCell(mHeader3);

        manifestTable.addCell(new Phrase(productName, normalFont));
        manifestTable.addCell(new Phrase(sku, normalFont));
        manifestTable.addCell(new Phrase(String.valueOf(allocation.getQuantityAllocated()), normalFont));

        document.add(manifestTable);

        // Footer Note
        Paragraph footer = new Paragraph(
                "STRIDE Supply Chain OS • Automated Packing Slip • " + order.getCreatedAt(), smallFont);
        footer.setAlignment(Element.ALIGN_CENTER);
        footer.setSpacingBefore(14f);
        document.add(footer);

        document.close();
        return out.toByteArray();
    }
}
