package auth

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"crossview-go-server/lib"
	"crossview-go-server/models"
)

type AuthController struct {
	logger    lib.Logger
	userRepo  *models.UserRepository
}

func NewAuthController(logger lib.Logger, db lib.Database) AuthController {
	userRepo := models.NewUserRepository(db.DB)
	return AuthController{
		logger:   logger,
		userRepo: userRepo,
	}
}

func (c *AuthController) Check(ctx *gin.Context) {
	session := sessions.Default(ctx)
	userID := session.Get("userId")
	
	hasAdmin, _ := c.userRepo.HasAdmin()
	hasUsers, _ := c.userRepo.Count()
	
	if userID == nil {
		ctx.JSON(http.StatusOK, gin.H{
			"authenticated": false,
			"hasAdmin":      hasAdmin,
			"hasUsers":      hasUsers > 0,
		})
		return
	}
	
	user, err := c.userRepo.FindByID(userID.(uint))
	if err != nil || user == nil {
		ctx.JSON(http.StatusOK, gin.H{
			"authenticated": false,
			"hasAdmin":      hasAdmin,
			"hasUsers":      hasUsers > 0,
		})
		return
	}
	
	ctx.JSON(http.StatusOK, gin.H{
		"authenticated": true,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"role":     user.Role,
		},
		"hasAdmin": hasAdmin,
		"hasUsers": hasUsers > 0,
	})
}

func (c *AuthController) Login(ctx *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
		return
	}
	
	user, err := c.userRepo.FindByUsername(req.Username)
	if err != nil || user == nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	
	if !user.VerifyPassword(req.Password) {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	
	session := sessions.Default(ctx)
	session.Set("userId", user.ID)
	session.Set("userRole", user.Role)
	if err := session.Save(); err != nil {
		c.logger.Error("Failed to save session: " + err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}
	
	c.logger.Infof("User logged in successfully: userId=%d, username=%s, role=%s", user.ID, user.Username, user.Role)
	
	ctx.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"role":     user.Role,
		},
	})
}

func (c *AuthController) Logout(ctx *gin.Context) {
	session := sessions.Default(ctx)
	session.Clear()
	if err := session.Save(); err != nil {
		c.logger.Error("Failed to clear session: " + err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to logout"})
		return
	}
	
	ctx.JSON(http.StatusOK, gin.H{"success": true})
}

func (c *AuthController) Register(ctx *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Username, email, and password are required"})
		return
	}
	
	hasUsers, _ := c.userRepo.Count()
	if hasUsers > 0 {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "Registration is disabled. Please contact an administrator."})
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
		Role:     "admin",
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
	
	session := sessions.Default(ctx)
	session.Set("userId", user.ID)
	session.Set("userRole", user.Role)
	if err := session.Save(); err != nil {
		c.logger.Error("Failed to save session: " + err.Error())
	}
	
	c.logger.Infof("User registered successfully: userId=%d, username=%s, email=%s, role=%s", user.ID, user.Username, user.Email, user.Role)
	
	ctx.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"role":     user.Role,
		},
	})
}

