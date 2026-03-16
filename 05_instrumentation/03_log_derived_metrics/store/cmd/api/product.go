package api

import (
	"log/slog"
	"net/http"
	"store-service/internal/product"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
)

type ProductAPI struct {
	ProductService product.ProductInterface
}

func (api ProductAPI) SearchHandler(c *gin.Context) {
	start := time.Now()
	ctx, span := otel.Tracer("store-service").Start(c.Request.Context(), "ProductAPI.SearchHandler")
	defer span.End()

	slog.Info("function_execution", "function", "SearchHandler", "event", "start")

	keyword := c.DefaultQuery("q", "")
	limit := c.DefaultQuery("limit", "30")
	offset := c.DefaultQuery("offset", "0")

	productResult, err := api.ProductService.GetProductsWithContext(ctx, keyword, limit, offset)

	elapsed := time.Since(start).Milliseconds()

	if err != nil {
		span.SetStatus(codes.Error, err.Error())
		span.RecordError(err)
		slog.Error("function_execution", "function", "SearchHandler", "event", "end", "duration_ms", elapsed, "error", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	span.SetAttributes(attribute.Int64("duration_ms", elapsed))
	slog.Info("function_execution", "function", "SearchHandler", "event", "end", "duration_ms", elapsed)
	c.JSON(http.StatusOK, productResult)
}

func (api ProductAPI) GetProductHandler(c *gin.Context) {
	start := time.Now()
	ctx, span := otel.Tracer("store-service").Start(c.Request.Context(), "ProductAPI.GetProductHandler")
	defer span.End()

	idParam := c.Param("id")
	slog.Info("function_execution", "function", "GetProductHandler", "event", "start", "product_id", idParam)

	id, err := strconv.Atoi(idParam)
	if err != nil {
		elapsed := time.Since(start).Milliseconds()
		slog.Error("function_execution", "function", "GetProductHandler", "event", "end", "duration_ms", elapsed, "error", "id is not integer")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "id is not integer",
		})
		return
	}

	span.SetAttributes(attribute.Int("product.id", id))
	productDetail, err := api.ProductService.GetProductByIDWithContext(ctx, id)

	elapsed := time.Since(start).Milliseconds()

	if err != nil {
		span.SetStatus(codes.Error, err.Error())
		span.RecordError(err)
		slog.Error("function_execution", "function", "GetProductHandler", "event", "end", "duration_ms", elapsed, "error", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	span.SetAttributes(attribute.Int64("duration_ms", elapsed))
	slog.Info("function_execution", "function", "GetProductHandler", "event", "end", "duration_ms", elapsed, "product_id", id)
	c.JSON(http.StatusOK, productDetail)
}
