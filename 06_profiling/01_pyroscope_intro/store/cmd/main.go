package main

import (
	"fmt"
	"log"
	"os"
	"store-service/cmd/api"
	"store-service/internal/healthcheck"

	"store-service/internal/product"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/grafana/pyroscope-go"
	"github.com/jmoiron/sqlx"
)

func main() {

	pyroscope.Start(pyroscope.Config{
		ApplicationName: "store-service",
		ServerAddress:   os.Getenv("PYROSCOPE_SERVER_ADDRESS"),
		ProfileTypes: []pyroscope.ProfileType{
			pyroscope.ProfileCPU,
			pyroscope.ProfileAllocObjects,
			pyroscope.ProfileAllocSpace,
			pyroscope.ProfileInuseObjects,
			pyroscope.ProfileInuseSpace,
		},
	})

	storeWebEndpoint := "http://localhost:3000"

	if os.Getenv("STORE_WEB_HOST") != "" {
		storeWebEndpoint = os.Getenv("STORE_WEB_HOST")
	}

	dbConnection := "user:password@(db:3306)/store"
	if os.Getenv("DB_CONNECTION") != "" {
		dbConnection = os.Getenv("DB_CONNECTION")
	}

	connection, err := sqlx.Connect("mysql", dbConnection)
	if err != nil {
		log.Fatalln("cannot connect to database", err)
	}
	defer connection.Close()

	productRepository := product.ProductRepositoryMySQL{
		DBConnection: connection,
	}
	productService := product.ProductService{
		ProductRepository: &productRepository,
	}

	productAPI := api.ProductAPI{
		ProductService: &productService,
	}

	route := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{storeWebEndpoint}
	route.Use(cors.New(config))

	route.GET("/api/v1/product", productAPI.SearchHandler)
	route.GET("/api/v1/product/:id", productAPI.GetProductHandler)

	route.GET("/api/v1/health", func(context *gin.Context) {
		user, err := healthcheck.GetUserNameFromDB(connection)
		if err != nil {
			context.JSON(500, gin.H{
				"error": err.Error(),
			})
			return
		}
		context.JSON(200, gin.H{
			"message": user,
		})
	})

	log.Fatal(route.Run(":8000"))
}

func GetUserNameFromDB(connection *sqlx.DB) User {
	user := User{}
	err := connection.Get(&user, "SELECT id,first_name,last_name FROM user WHERE id=1")
	if err != nil {
		fmt.Printf("Get user name from tearup get error : %s", err.Error())
		return User{}
	}
	return user
}

type User struct {
	ID        int    `db:"id"`
	FirstName string `db:"first_name"`
	LastName  string `db:"last_name"`
}
