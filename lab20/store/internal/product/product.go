package product

import (
	"context"
	"log"
	"log/slog"
	"store-service/internal/common"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
)

type ProductInterface interface {
	GetProducts(keyword string, limit string, offset string) (ProductResult, error)
	GetProductByID(ID int) (ProductDetail, error)
	GetProductsWithContext(ctx context.Context, keyword string, limit string, offset string) (ProductResult, error)
	GetProductByIDWithContext(ctx context.Context, ID int) (ProductDetail, error)
}

type ProductService struct {
	ProductRepository ProductRepository
}

func (productService ProductService) GetProducts(keyword string, limit string, offset string) (ProductResult, error) {
	return productService.GetProductsWithContext(context.Background(), keyword, limit, offset)
}

func (productService ProductService) GetProductsWithContext(ctx context.Context, keyword string, limit string, offset string) (ProductResult, error) {
	start := time.Now()
	_, span := otel.Tracer("store-service").Start(ctx, "ProductService.GetProducts")
	defer span.End()

	slog.Info("function_execution", "function", "ProductService.GetProducts", "event", "start")

	res, err := productService.ProductRepository.GetProducts(keyword, limit, offset)
	elapsed := time.Since(start).Milliseconds()

	if err != nil {
		log.Printf("ProductRepository.GetProducts internal error %s", err.Error())
		span.SetStatus(codes.Error, err.Error())
		span.RecordError(err)
		slog.Error("function_execution", "function", "ProductService.GetProducts", "event", "end", "duration_ms", elapsed, "error", err.Error())
		return ProductResult{}, err
	}

	for i := range res.Products {
		p := &res.Products[i]
		digit := common.ConvertToThb(p.Price)

		p.PriceTHB = digit.ShortDecimal
		p.PriceFullTHB = digit.LongDecimal
	}

	span.SetAttributes(attribute.Int64("duration_ms", elapsed))
	slog.Info("function_execution", "function", "ProductService.GetProducts", "event", "end", "duration_ms", elapsed, "count", len(res.Products))
	return res, err
}

func (productService ProductService) GetProductByID(ID int) (ProductDetail, error) {
	return productService.GetProductByIDWithContext(context.Background(), ID)
}

func (productService ProductService) GetProductByIDWithContext(ctx context.Context, ID int) (ProductDetail, error) {
	start := time.Now()
	_, span := otel.Tracer("store-service").Start(ctx, "ProductService.GetProductByID")
	defer span.End()

	span.SetAttributes(attribute.Int("product.id", ID))
	slog.Info("function_execution", "function", "ProductService.GetProductByID", "event", "start", "product_id", ID)

	productDetail, err := productService.ProductRepository.GetProductByID(ID)
	elapsed := time.Since(start).Milliseconds()

	if err != nil {
		log.Printf("ProductRepository.GetProductByID internal error %s", err.Error())
		span.SetStatus(codes.Error, err.Error())
		span.RecordError(err)
		slog.Error("function_execution", "function", "ProductService.GetProductByID", "event", "end", "duration_ms", elapsed, "error", err.Error())
		return ProductDetail{}, err
	}

	p := &productDetail
	digit := common.ConvertToThb(p.Price)

	p.PriceTHB = digit.ShortDecimal
	p.PriceFullTHB = digit.LongDecimal

	span.SetAttributes(attribute.Int64("duration_ms", elapsed))
	slog.Info("function_execution", "function", "ProductService.GetProductByID", "event", "end", "duration_ms", elapsed, "product_id", ID)
	return productDetail, err
}
