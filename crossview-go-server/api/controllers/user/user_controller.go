package user

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"crossview-go-server/lib"
	"crossview-go-server/models"
)

type UserController struct {
	logger   lib.Logger
	userRepo *models.UserRepository
}

func NewUserController(logger lib.Logger, db lib.Database) UserController {
	userRepo := models.NewUserRepository(db.DB)
	return UserController{
		logger:   logger,
		userRepo: userRepo,
	}
}

func (c *UserController) GetUsers(ctx *gin.Context) {
	users, err := c.userRepo.FindAll()
	if err != nil {
		c.logger.Error("Failed to get users: " + err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}

	ctx.JSON(http.StatusOK, users)
}

func (c *UserController) CreateUser(ctx *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Username, email, and password are required"})
		return
	}

	if req.Role == "" {
		req.Role = "user"
	}

	if req.Role != "admin" && req.Role != "user" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Role must be 'admin' or 'user'"})
		return
	}

	existingUser, _ := c.userRepo.FindByUsername(req.Username)
	if existingUser != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Username already exists"})
		return
	}

	existingEmail, _ := c.userRepo.FindByEmail(req.Email)
	if existingEmail != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Email already exists"})
		return
	}

	user := &models.User{
		Username: req.Username,
		Email:    req.Email,
		Role:     req.Role,
	}

	if err := user.SetPassword(req.Password); err != nil {
		c.logger.Error("Failed to hash password: " + err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	if err := c.userRepo.Create(user); err != nil {
		c.logger.Error("Failed to create user: " + err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.logger.Infof("User created successfully: userId=%d, username=%s, email=%s, role=%s", user.ID, user.Username, user.Email, user.Role)

	ctx.JSON(http.StatusOK, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
		"role":     user.Role,
		"created_at": user.CreatedAt,
	})
}

func (c *UserController) UpdateUser(ctx *gin.Context) {
	idParam := ctx.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	user, err := c.userRepo.FindByID(uint(id))
	if err != nil || user == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if req.Username != "" {
		if req.Username != user.Username {
			existingUser, _ := c.userRepo.FindByUsername(req.Username)
			if existingUser != nil && existingUser.ID != user.ID {
				ctx.JSON(http.StatusBadRequest, gin.H{"error": "Username already exists"})
				return
			}
		}
		user.Username = req.Username
	}

	if req.Email != "" {
		if req.Email != user.Email {
			existingEmail, _ := c.userRepo.FindByEmail(req.Email)
			if existingEmail != nil && existingEmail.ID != user.ID {
				ctx.JSON(http.StatusBadRequest, gin.H{"error": "Email already exists"})
				return
			}
		}
		user.Email = req.Email
	}

	if req.Role != "" {
		if req.Role != "admin" && req.Role != "user" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Role must be 'admin' or 'user'"})
			return
		}
		user.Role = req.Role
	}

	if req.Password != "" {
		if err := user.SetPassword(req.Password); err != nil {
			c.logger.Error("Failed to hash password: " + err.Error())
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
			return
		}
	}

	if err := c.userRepo.Update(user); err != nil {
		c.logger.Error("Failed to update user: " + err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.logger.Infof("User updated successfully: userId=%d, username=%s, email=%s, role=%s", user.ID, user.Username, user.Email, user.Role)

	ctx.JSON(http.StatusOK, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
		"role":     user.Role,
		"created_at": user.CreatedAt,
		"updated_at": user.UpdatedAt,
	})
}

