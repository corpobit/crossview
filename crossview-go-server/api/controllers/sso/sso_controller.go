package sso

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"crossview-go-server/lib"
	"crossview-go-server/services"
)

type SSOController struct {
	logger    lib.Logger
	env       lib.Env
	ssoService services.SSOServiceInterface
}

func NewSSOController(logger lib.Logger, env lib.Env, ssoService services.SSOServiceInterface) SSOController {
	return SSOController{
		logger:    logger,
		env:       env,
		ssoService: ssoService,
	}
}

func (c *SSOController) GetStatus(ctx *gin.Context) {
	ssoConfig := c.ssoService.GetSSOStatus()
	ctx.JSON(http.StatusOK, gin.H{
		"enabled": ssoConfig.Enabled,
		"oidc": gin.H{
			"enabled": ssoConfig.OIDC.Enabled,
		},
		"saml": gin.H{
			"enabled": ssoConfig.SAML.Enabled,
		},
	})
}

func (c *SSOController) InitiateOIDC(ctx *gin.Context) {
	authURL, err := c.ssoService.InitiateOIDC(ctx.Request.Context())
	if err != nil {
		c.logger.Errorf("OIDC initiation failed: %s", err.Error())
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	
	ctx.Redirect(http.StatusFound, authURL)
}

func (c *SSOController) HandleOIDCCallback(ctx *gin.Context) {
	code := ctx.Query("code")
	state := ctx.Query("state")
	errorParam := ctx.Query("error")
	
	if errorParam != "" {
		c.logger.Warnf("OIDC callback error: %s", errorParam)
		frontendURL := c.env.CORSOrigin
		ctx.Redirect(http.StatusFound, frontendURL+"/login?error=sso_failed")
		return
	}
	
	if code == "" {
		c.logger.Warn("OIDC callback missing code parameter")
		frontendURL := c.env.CORSOrigin
		ctx.Redirect(http.StatusFound, frontendURL+"/login?error=sso_failed")
		return
	}
	
	user, err := c.ssoService.HandleOIDCCallback(ctx.Request.Context(), code, state)
	if err != nil {
		c.logger.Errorf("OIDC callback failed: %s", err.Error())
		frontendURL := c.env.CORSOrigin
		ctx.Redirect(http.StatusFound, frontendURL+"/login?error=sso_failed")
		return
	}
	
	session := sessions.Default(ctx)
	session.Set("userId", user.ID)
	session.Set("userRole", user.Role)
	if err := session.Save(); err != nil {
		c.logger.Errorf("Failed to save session: %s", err.Error())
		frontendURL := c.env.CORSOrigin
		ctx.Redirect(http.StatusFound, frontendURL+"/login?error=sso_failed")
		return
	}
	
	c.logger.Infof("OIDC login successful: userId=%d, username=%s", user.ID, user.Username)
	frontendURL := c.env.CORSOrigin
	ctx.Redirect(http.StatusFound, frontendURL)
}

func (c *SSOController) InitiateSAML(ctx *gin.Context) {
	authURL, err := c.ssoService.InitiateSAML(ctx.Request.Context())
	if err != nil {
		c.logger.Errorf("SAML initiation failed: %s", err.Error())
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	
	ctx.Redirect(http.StatusFound, authURL)
}

func (c *SSOController) HandleSAMLCallback(ctx *gin.Context) {
	samlResponse := ctx.PostForm("SAMLResponse")
	if samlResponse == "" {
		c.logger.Warn("SAML callback missing SAMLResponse")
		frontendURL := c.env.CORSOrigin
		ctx.Redirect(http.StatusFound, frontendURL+"/login?error=sso_failed")
		return
	}
	
	user, err := c.ssoService.HandleSAMLCallback(ctx.Request.Context(), samlResponse)
	if err != nil {
		c.logger.Errorf("SAML callback failed: %s", err.Error())
		frontendURL := c.env.CORSOrigin
		ctx.Redirect(http.StatusFound, frontendURL+"/login?error=sso_failed")
		return
	}
	
	session := sessions.Default(ctx)
	session.Set("userId", user.ID)
	session.Set("userRole", user.Role)
	if err := session.Save(); err != nil {
		c.logger.Errorf("Failed to save session: %s", err.Error())
		frontendURL := c.env.CORSOrigin
		ctx.Redirect(http.StatusFound, frontendURL+"/login?error=sso_failed")
		return
	}
	
	c.logger.Infof("SAML login successful: userId=%d, username=%s", user.ID, user.Username)
	frontendURL := c.env.CORSOrigin
	ctx.Redirect(http.StatusFound, frontendURL)
}

